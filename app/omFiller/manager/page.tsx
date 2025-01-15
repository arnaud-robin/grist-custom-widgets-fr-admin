"use client";

import { useState, useEffect, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { Title } from "../../../components/Title";
import { Footer } from "../../../components/Footer";
import { useGristEffect } from "../../../lib/grist/hooks";
import { WidgetColumnMap } from "grist/CustomSectionAPI";
import { RowRecord } from "grist/GristData";
import { COLUMN_MAPPING_NAMES, NO_DATA_MESSAGES, TITLE } from "./constants";
import { PdfPreview } from "../PdfPreview";
import { downloadAttachment } from "../attachments";
import { savePdfToGrist } from "../pdfStorage";
import { Configuration } from "../../../components/Configuration";
import Image from "next/image";
import specificSvg from "../../../public/specific-processing.svg";

interface GristData {
  records: RowRecord[];
  mappings: WidgetColumnMap;
}

const ManagerSignatureWidget = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [gristData, setGristData] = useState<GristData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [completePdfBytes, setCompletePdfBytes] = useState<Uint8Array | null>(null);
  const [hasEtatFrais, setHasEtatFrais] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useGristEffect(() => {
    grist.ready({
      columns: Object.values(COLUMN_MAPPING_NAMES),
      requiredAccess: "full",
    });

    grist.onRecord(async (record, mappings) => {
      console.log("Record changed:", record);
      console.log("Mappings received:", mappings);
      if (mappings && record) {
        const hasEF = Boolean(
          record[
            mappings[
              COLUMN_MAPPING_NAMES.PDF_EF_INPUT.name
            ] as keyof typeof record
          ],
        );
        setHasEtatFrais(hasEF);
        setGristData({ records: [record], mappings });
      }
    });
  }, []);

  const previewFirstPage = useCallback(async () => {
    if (!gristData) {
      console.error("No Grist data available");
      return;
    }

    const inputFieldName = hasEtatFrais
      ? COLUMN_MAPPING_NAMES.PDF_EF_INPUT.name
      : COLUMN_MAPPING_NAMES.PDF_INPUT.name;

    if (!gristData.mappings[inputFieldName]) {
      console.error(`${inputFieldName} not found in Grist data`);
      return;
    }

    try {
      setIsProcessing(true);
      
      // Load input PDF
      const attachmentId = Number(
        gristData.records[0][
          gristData.mappings[inputFieldName] as keyof (typeof gristData.records)[0]
        ],
      );
      const pdfArrayBuffer = await downloadAttachment(attachmentId);
      const pdfBytes = new Uint8Array(pdfArrayBuffer);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Add signature if available
      const signatureField = COLUMN_MAPPING_NAMES.SIGNATURE.form_field;
      if (signatureField && gristData) {
        const signaturePosition = hasEtatFrais
          ? signatureField.alternate
          : signatureField.default;

        const { x, y, maxHeight } = signaturePosition;
        const signatureAttachmentId = Number(
          gristData.records[0][
            gristData.mappings[
              COLUMN_MAPPING_NAMES.SIGNATURE.name
            ] as keyof (typeof gristData.records)[0]
          ],
        );
        const imageBytes = await downloadAttachment(signatureAttachmentId);
        const image = await pdfDoc.embedPng(new Uint8Array(imageBytes));

        const aspectRatio = image.width / image.height;
        const width = maxHeight * aspectRatio;

        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        firstPage.drawImage(image, {
          x,
          y,
          width,
          height: maxHeight,
        });
      }

      // Save complete PDF
      const currentPdfBytes = await pdfDoc.save();
      setCompletePdfBytes(currentPdfBytes);

      // Create preview with first page only
      const previewDoc = await PDFDocument.create();
      const [firstPage] = await previewDoc.copyPages(pdfDoc, [0]);
      previewDoc.addPage(firstPage);
      const previewBytes = await previewDoc.save();
      
      const blob = new Blob([previewBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

    } catch (error) {
      console.error("Error generating preview:", error);
      setFeedbackMessage({
        type: "error",
        message: "Failed to generate preview",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 2000);
    }
  }, [gristData, hasEtatFrais]);

  const savePdf = async () => {
    if (!completePdfBytes || !gristData) return;

    try {
      setIsProcessing(true);
      const outputFieldName = hasEtatFrais
        ? COLUMN_MAPPING_NAMES.PDF_EF_OUTPUT.name
        : COLUMN_MAPPING_NAMES.PDF_OUTPUT.name;

      await savePdfToGrist(
        completePdfBytes,
        gristData,
        outputFieldName,
        "signed",
      );
      setFeedbackMessage({
        type: "success",
        message: "PDF saved successfully!",
      });
    } catch (error) {
      console.error("Error saving PDF:", error);
      setFeedbackMessage({ type: "error", message: "Failed to save PDF" });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 2000);
    }
  };

  useEffect(() => {
    if (gristData) {
      previewFirstPage();
    }
  }, [gristData, previewFirstPage]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const mappingsIsReady = (mappings: WidgetColumnMap) => {
    return Object.values(COLUMN_MAPPING_NAMES).every(
      (config) => mappings[config.name] !== null,
    );
  };

  if (!gristData?.records[0]) {
    return (
      <div>
        <Title title={TITLE} />
        <div className="centered-column">
          <Image
            priority
            src={specificSvg}
            style={{ marginBottom: "1rem" }}
            alt="single record"
          />
          <div className="error-message">
            <p>{NO_DATA_MESSAGES.NO_RECORDS}</p>
          </div>
        </div>
        <Footer dataSource={<span>OM Filler powered by pdf-lib</span>} />
      </div>
    );
  }

  if (!gristData?.mappings || !mappingsIsReady(gristData.mappings)) {
    return (
      <div>
        <Title title={TITLE} />
        <Configuration>
          <p>{NO_DATA_MESSAGES.NO_MAPPING}</p>
        </Configuration>
        <Footer dataSource={<span>OM Filler powered by pdf-lib</span>} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Title title={TITLE} />
      <div
        style={{
          padding: "0 10px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {isProcessing && <div>Processing...</div>}
        {previewUrl ? (
          <>
            <PdfPreview previewUrl={previewUrl} />
            <div
              style={{
                padding: "10px 0 20px 0",
                textAlign: "center",
                position: "sticky",
                bottom: 0,
              }}
            >
              {feedbackMessage ? (
                <div
                  style={{
                    color:
                      feedbackMessage.type === "success"
                        ? "#4caf50"
                        : "#f44336",
                  }}
                >
                  {feedbackMessage.message}
                </div>
              ) : (
                <button
                  className="primary"
                  onClick={savePdf}
                  disabled={isProcessing}
                >
                  Save to Grist
                </button>
              )}
            </div>
          </>
        ) : (
          <div>Loading preview...</div>
        )}
      </div>
      <Footer dataSource={<span>OM Filler powered by pdf-lib</span>} />
    </div>
  );
};

export default ManagerSignatureWidget;
