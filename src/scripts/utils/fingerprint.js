// src/utils/fingerprint.js

import fs from "fs";
import path from "path";

export function fingerprint(publicPath) {
  const filePath = path.resolve(
    "./public",
    publicPath.replace(/^\/+/, "")
  );

  const version = fs.statSync(filePath).mtimeMs;

  return `${publicPath}?v=${version}`;
}