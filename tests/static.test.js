"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("요구된 정적 파일이 모두 존재한다", () => {
  const required = [
    "AGENTS.md",
    "SPEC.md",
    "README.md",
    "index.html",
    "style.css",
    "script.js",
    "robots.txt",
    "sitemap.xml",
    "404.html",
    ".gitignore"
  ];

  for (const file of required) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should exist`);
  }
});

test("index.html은 H1 하나와 필수 SEO 메타데이터를 가진다", () => {
  assert.equal((html.match(/<h1\b/gi) || []).length, 1);
  assert.match(html, /<title>[^<]+<\/title>/i);
  assert.match(html, /<meta name="description"/i);
  assert.match(html, /<meta property="og:title"/i);
  assert.match(html, /<meta property="og:description"/i);
  assert.doesNotMatch(html, /rel="canonical"/i);
  assert.doesNotMatch(html, /property="og:url"/i);
});

test("두 계산 모드와 접근성 연결 정보가 존재한다", () => {
  assert.match(html, /id="panel-room"[^>]*role="tabpanel"/i);
  assert.match(html, /id="panel-projector"[^>]*role="tabpanel"/i);
  assert.match(html, /role="tablist"/i);
  assert.match(html, /aria-live="polite"/i);
  assert.match(html, /class="skip-link"/i);
});

test("HTML이 외부 스크립트, 스타일, 이미지 요청을 만들지 않는다", () => {
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)=["']https?:\/\//i);
  assert.match(html, /href="style\.css"/i);
  assert.match(html, /src="script\.js"/i);
});
