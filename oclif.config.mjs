/**
 * @typedef {import('@oclif/core').Config} Config
 */

/** @type {Config} */
export default {
  bin: "bruno-xray-plugin",
  commands: "./src/commands",
  dirname: "bruno-xray-plugin",
  topics: {
    xray: { description: "subcommands for Xray interaction" },
  },
  topicSeparator: " ",
};
