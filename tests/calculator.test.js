"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateScreenDimensions,
  calculateModeA,
  calculateModeB,
  parseAspectRatio,
  validateNumber
} = require("../script.js");

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
};

test("16:9 100인치 화면 크기가 검증 기준과 일치한다", () => {
  const screen = calculateScreenDimensions(100, "16:9");
  closeTo(screen.width, 2.213801864296355, 1e-12);
  closeTo(screen.height, 1.2452635486666996, 1e-12);
});

test("모드 A는 2.7m와 100인치에서 약 1.22의 최대 투사비를 계산한다", () => {
  const result = calculateModeA(2.7, 100, "16:9");
  closeTo(result.maxThrowRatio, 1.2196213417040285, 1e-12);
  assert.equal(result.maxThrowRatio.toFixed(2), "1.22");
});

test("모드 B는 투사비 1.2~1.5와 100인치에서 약 2.66~3.32m를 계산한다", () => {
  const result = calculateModeB(1.2, 1.5, 100, "16:9");
  assert.equal(result.minDistance.toFixed(2), "2.66");
  assert.equal(result.maxDistance.toFixed(2), "3.32");
});

test("줌이 없는 모델의 동일한 투사비를 허용한다", () => {
  const result = calculateModeB(1.2, 1.2, 100, "16:9");
  closeTo(result.minDistance, result.maxDistance);
});

test("지원하는 모든 화면 비율에서 대각선과 가로·세로가 일치한다", () => {
  for (const aspectRatio of ["16:9", "16:10", "4:3"]) {
    const [widthRatio, heightRatio] = parseAspectRatio(aspectRatio);
    const result = calculateScreenDimensions(100, aspectRatio);
    closeTo(Math.hypot(result.width, result.height), 2.54);
    closeTo(result.width / result.height, widthRatio / heightRatio);
  }
});

test("지원하지 않는 화면 비율과 잘못된 계산값을 거부한다", () => {
  assert.throws(() => calculateScreenDimensions(100, "21:9"), RangeError);
  assert.throws(() => calculateScreenDimensions(0, "16:9"), RangeError);
  assert.throws(() => calculateModeA(-1, 100, "16:9"), RangeError);
  assert.throws(() => calculateModeB(1.5, 1.2, 100, "16:9"), RangeError);
});

test("빈 값, 0, 음수, 범위 밖 값과 숫자가 아닌 값을 검증한다", () => {
  const options = { min: 10, max: 500, label: "화면 크기" };
  assert.equal(validateNumber("", options).valid, false);
  assert.equal(validateNumber("0", options).valid, false);
  assert.equal(validateNumber("-1", options).valid, false);
  assert.equal(validateNumber("501", options).valid, false);
  assert.equal(validateNumber("abc", options).valid, false);
  assert.equal(validateNumber("100", options).valid, true);
});
