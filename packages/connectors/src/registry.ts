import type { SourceConnector } from "./interface";
import { SlackConnector } from "./slack";
import { FileUploadConnector } from "./file-upload";

const connectors: Record<string, SourceConnector> = {
  slack: new SlackConnector(),
  manual: new FileUploadConnector(),
};

/**
 * Get a connector by source type.
 */
export function getConnector(sourceType: string): SourceConnector | undefined {
  return connectors[sourceType];
}
