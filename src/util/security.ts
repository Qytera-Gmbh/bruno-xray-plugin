/**
 * Replaces all occurrences of specific sensitive values in the provided content with a masked
 * string.
 *
 * @param content the string containing possibly sensitive data
 * @param sensitiveValues an array of sensitive values to mask
 * @param [strategy="all-stars-except-first-last"] the masking strategy to apply
 * @returns the masked string
 */
export function maskSensitiveValues(
  content: string,
  sensitiveValues: string[],
  strategy: "all-stars-except-first-last" | "all-stars" = "all-stars-except-first-last"
): string {
  let resultContent = content;
  for (const sensitiveValue of sensitiveValues) {
    switch (strategy) {
      case "all-stars": {
        resultContent = resultContent.replaceAll(sensitiveValue, mask(sensitiveValue, "*"));
        break;
      }
      case "all-stars-except-first-last":
        resultContent = resultContent.replaceAll(
          sensitiveValue,
          maskKeepFirstLast(sensitiveValue, "*")
        );
        break;
    }
  }
  return resultContent;
}

function mask(content: string, maskCharacter: string) {
  return maskCharacter.repeat(content.length);
}

function maskKeepFirstLast(content: string, maskCharacter: string) {
  if (content.length <= 2) {
    return mask(content, maskCharacter);
  }
  return `${content[0]}${maskCharacter.repeat(content.length - 2)}${content[content.length - 1]}`;
}
