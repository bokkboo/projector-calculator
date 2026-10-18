(function (globalScope) {
  "use strict";

  const METERS_PER_INCH = 0.0254;
  const ASPECT_RATIOS = Object.freeze({
    "16:9": Object.freeze([16, 9]),
    "16:10": Object.freeze([16, 10]),
    "4:3": Object.freeze([4, 3])
  });

  function parseAspectRatio(aspectRatio) {
    const ratio = ASPECT_RATIOS[aspectRatio];
    if (!ratio) {
      throw new RangeError("지원하지 않는 화면 비율입니다.");
    }
    return ratio;
  }

  function assertPositiveFinite(value, label) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError((label || "값") + "은(는) 0보다 큰 숫자여야 합니다.");
    }
  }

  function calculateScreenDimensions(inches, aspectRatio) {
    assertPositiveFinite(inches, "화면 크기");
    const ratio = parseAspectRatio(aspectRatio);
    const diagonal = inches * METERS_PER_INCH;
    const divisor = Math.sqrt((ratio[0] ** 2) + (ratio[1] ** 2));

    return {
      diagonal,
      width: diagonal * ratio[0] / divisor,
      height: diagonal * ratio[1] / divisor
    };
  }

  function calculateModeA(distance, inches, aspectRatio) {
    assertPositiveFinite(distance, "확보 거리");
    const screen = calculateScreenDimensions(inches, aspectRatio);

    return {
      ...screen,
      distance,
      maxThrowRatio: distance / screen.width
    };
  }

  function calculateModeB(minThrowRatio, maxThrowRatio, inches, aspectRatio) {
    assertPositiveFinite(minThrowRatio, "최소 투사비");
    assertPositiveFinite(maxThrowRatio, "최대 투사비");

    if (maxThrowRatio < minThrowRatio) {
      throw new RangeError("최대 투사비는 최소 투사비보다 작을 수 없습니다.");
    }

    const screen = calculateScreenDimensions(inches, aspectRatio);

    return {
      ...screen,
      minThrowRatio,
      maxThrowRatio,
      minDistance: screen.width * minThrowRatio,
      maxDistance: screen.width * maxThrowRatio
    };
  }

  function validateNumber(rawValue, options) {
    const valueAsText = String(rawValue).trim();

    if (valueAsText === "") {
      return { valid: false, value: NaN, message: options.label + "을(를) 입력해 주세요." };
    }

    const value = Number(valueAsText);

    if (!Number.isFinite(value)) {
      return { valid: false, value, message: options.label + "은(는) 숫자로 입력해 주세요." };
    }

    if (value <= 0) {
      return { valid: false, value, message: options.label + "은(는) 0보다 커야 합니다." };
    }

    if (value < options.min || value > options.max) {
      return {
        valid: false,
        value,
        message: options.label + "은(는) " + options.min + "~" + options.max + " 범위로 입력해 주세요."
      };
    }

    return { valid: true, value, message: "" };
  }

  const api = Object.freeze({
    METERS_PER_INCH,
    ASPECT_RATIOS,
    parseAspectRatio,
    calculateScreenDimensions,
    calculateModeA,
    calculateModeB,
    validateNumber
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof document === "undefined") {
    return;
  }

  globalScope.ProjectorCalculator = api;

  const byId = (id) => document.getElementById(id);
  const meter3 = new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
  const meter2 = new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const ratio2 = new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function setFieldState(input, errorElement, result) {
    input.setAttribute("aria-invalid", String(!result.valid));
    errorElement.textContent = result.message;
  }

  function validateField(inputId, errorId, options) {
    const input = byId(inputId);
    const errorElement = byId(errorId);
    const result = validateNumber(input.value, options);
    setFieldState(input, errorElement, result);
    return result;
  }

  function showResult(contentId, errorId, isValid) {
    byId(contentId).hidden = !isValid;
    byId(errorId).hidden = isValid;
  }

  function emitCalculation(mode, result, inputs) {
    document.dispatchEvent(new CustomEvent("projector-calculator:calculated", {
      detail: {
        mode,
        inputs,
        result
      }
    }));
  }

  function setScreenShape(element, aspectRatio) {
    const ratio = parseAspectRatio(aspectRatio);
    const normalizedHeight = Math.round(38 + (ratio[1] / ratio[0]) * 38);
    element.style.height = normalizedHeight + "px";
  }

  function updateRoomCalculation(event) {
    const distanceState = validateField("room-distance", "room-distance-error", {
      min: 0.1,
      max: 30,
      label: "확보 거리"
    });
    const sizeState = validateField("room-size", "room-size-error", {
      min: 10,
      max: 500,
      label: "화면 크기"
    });
    const aspectRatio = byId("room-ratio").value;
    const isValid = distanceState.valid && sizeState.valid;

    showResult("room-result-content", "room-result-error", isValid);

    if (!isValid) {
      return;
    }

    const result = calculateModeA(distanceState.value, sizeState.value, aspectRatio);
    byId("room-throw-ratio").textContent = ratio2.format(result.maxThrowRatio) + " 이하";
    byId("room-width").textContent = meter3.format(result.width) + " m";
    byId("room-height").textContent = meter3.format(result.height) + " m";
    byId("room-distance-visual").textContent = meter2.format(result.distance) + " m 확보";
    setScreenShape(byId("room-screen-visual"), aspectRatio);

    if (event) {
      emitCalculation("room", result, {
        distance: distanceState.value,
        inches: sizeState.value,
        aspectRatio
      });
    }
  }

  function updateProjectorCalculation(event) {
    const minState = validateField("throw-min", "throw-min-error", {
      min: 0.05,
      max: 10,
      label: "최소 투사비"
    });
    const maxState = validateField("throw-max", "throw-max-error", {
      min: 0.05,
      max: 10,
      label: "최대 투사비"
    });
    const sizeState = validateField("projector-size", "projector-size-error", {
      min: 10,
      max: 500,
      label: "화면 크기"
    });
    const aspectRatio = byId("projector-ratio").value;

    if (minState.valid && maxState.valid && maxState.value < minState.value) {
      maxState.valid = false;
      maxState.message = "최대 투사비는 최소 투사비보다 크거나 같아야 합니다.";
      setFieldState(byId("throw-max"), byId("throw-max-error"), maxState);
    }

    const isValid = minState.valid && maxState.valid && sizeState.valid;
    showResult("projector-result-content", "projector-result-error", isValid);

    if (!isValid) {
      return;
    }

    const result = calculateModeB(minState.value, maxState.value, sizeState.value, aspectRatio);
    const sameDistance = Math.abs(result.minDistance - result.maxDistance) < Number.EPSILON;
    const distanceText = sameDistance
      ? meter2.format(result.minDistance) + " m"
      : meter2.format(result.minDistance) + "–" + meter2.format(result.maxDistance) + " m";

    byId("projector-distance").textContent = distanceText;
    byId("projector-width").textContent = meter3.format(result.width) + " m";
    byId("projector-height").textContent = meter3.format(result.height) + " m";
    byId("projector-distance-visual").textContent = distanceText;
    setScreenShape(byId("projector-screen-visual"), aspectRatio);

    if (event) {
      emitCalculation("projector", result, {
        minThrowRatio: minState.value,
        maxThrowRatio: maxState.value,
        inches: sizeState.value,
        aspectRatio
      });
    }
  }

  function activateTab(nextTab) {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

    tabs.forEach((tab) => {
      const isActive = tab === nextTab;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      byId(tab.getAttribute("aria-controls")).hidden = !isActive;
    });
  }

  function handleTabKeydown(event) {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.indexOf(event.currentTarget);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    activateTab(tabs[nextIndex]);
    tabs[nextIndex].focus();
  }

  function bindForm(formId, updateFunction) {
    const form = byId(formId);
    form.addEventListener("submit", (event) => event.preventDefault());
    form.addEventListener("input", updateFunction);
  }

  function initialize() {
    document.querySelectorAll('[role="tab"]').forEach((tab) => {
      tab.addEventListener("click", () => activateTab(tab));
      tab.addEventListener("keydown", handleTabKeydown);
    });

    bindForm("room-form", updateRoomCalculation);
    bindForm("projector-form", updateProjectorCalculation);

    updateRoomCalculation();
    updateProjectorCalculation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(typeof window !== "undefined" ? window : globalThis);
