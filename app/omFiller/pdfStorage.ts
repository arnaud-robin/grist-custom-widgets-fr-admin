import { WidgetColumnMap } from "grist/CustomSectionAPI";
import { RowRecord } from "grist/GristData";
import { uploadAttachment, updateRecordWithAttachment } from "./attachments";

interface GristData {
  records: RowRecord[];
  mappings: WidgetColumnMap;
}

export const savePdfToGrist = async (
  pdfBytes: Uint8Array,
  gristData: GristData,
  outputColumnName: string,
  prefix: string = "form",
) => {
  if (!gristData?.records[0] || !gristData.mappings[outputColumnName]) {
    throw new Error("Missing required Grist data");
  }

  try {
    const tableId = await grist.getTable().getTableId();
    const recordId = gristData.records[0].id;

    // Upload attachment
    const fileName = `${prefix}_${new Date().toISOString()}.pdf`;
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const attachmentId = await uploadAttachment(blob, fileName);

    // Update record
    await updateRecordWithAttachment(
      tableId,
      recordId,
      outputColumnName,
      attachmentId,
    );
  } catch (error) {
    console.error("Error in savePdfToGrist:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to save PDF to Grist",
    );
  }
};
