"use client";

import { useState, useEffect, useCallback } from "react";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
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

const AgentExpenseWidget = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [gristData, setGristData] = useState<GristData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [completePdfBytes, setCompletePdfBytes] = useState<Uint8Array | null>(
    null,
  );
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
        setGristData({ records: [record], mappings });
      }
    });
  }, []);

  const createPreview = async (pdfDoc: PDFDocument): Promise<Uint8Array> => {
    const newPdfDoc = await PDFDocument.create();
    const [firstPage] = await newPdfDoc.copyPages(pdfDoc, [0]);
    newPdfDoc.addPage(firstPage);
    return await newPdfDoc.save();
  };

  const loadPdf = useCallback(async () => {
    if (
      !gristData?.mappings[COLUMN_MAPPING_NAMES.PDF_INPUT.name] ||
      !gristData.records[0][
        gristData.mappings[
          COLUMN_MAPPING_NAMES.PDF_INPUT.name
        ] as keyof (typeof gristData.records)[0]
      ]
    ) {
      console.error("PDF_INPUT not found in Grist data");
      return;
    }

    try {
      setIsProcessing(true);
      const attachmentId = Number(
        gristData.records[0][
          gristData.mappings[
            COLUMN_MAPPING_NAMES.PDF_INPUT.name
          ] as keyof (typeof gristData.records)[0]
        ],
      );
      const pdfArrayBuffer = await downloadAttachment(attachmentId);
      const pdfBytes = new Uint8Array(pdfArrayBuffer);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      if (gristData?.records[0] && gristData.mappings) {
        const record = gristData.records[0];

        // Process each field mapping
        for (const [key, config] of Object.entries(COLUMN_MAPPING_NAMES)) {
          if (key === "PDF_OUTPUT") continue;

          const columnId = config.name;
          const fieldMapping = config.form_field;
          const value =
            record[gristData.mappings[columnId] as keyof typeof record];

          try {
            // Handle datetime fields
            if (["DATE_HEURE_DEPART", "DATE_HEURE_ARRIVEE"].includes(key)) {
              if (
                typeof fieldMapping === "object" &&
                fieldMapping !== null &&
                value instanceof Date
              ) {
                const date = new Date(value);

                // Format date as DD/MM/YYYY
                const formattedDate = date.toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });

                // Format time as HH:mm
                const formattedTime = date.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });

                // Fill date field
                if ("date" in fieldMapping && fieldMapping.date) {
                  const dateField = form.getFieldMaybe(fieldMapping.date);
                  if (dateField instanceof PDFTextField) {
                    dateField.setText(formattedDate);
                  }
                }

                // Fill time field
                if ("time" in fieldMapping && fieldMapping.time) {
                  const timeField = form.getFieldMaybe(fieldMapping.time);
                  if (timeField instanceof PDFTextField) {
                    timeField.setText(formattedTime);
                  }
                }
                continue;
              }
            }
            // Handle signature date
            if (
              key === "SIGNATURE_DATE" &&
              value &&
              value instanceof Date &&
              typeof fieldMapping === "string"
            ) {
              const date = new Date(value);
              const formattedDate = date.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
              const field = form.getFieldMaybe(fieldMapping);
              if (field instanceof PDFTextField) {
                field.setText(formattedDate);
              }
              continue;
            }

            // Handle checkbox fields
            if (
              [
                "BILLET_MISSIONE",
                "TRANSPORT_COMMUN",
                "HOTEL_MISSIONE",
              ].includes(key)
            ) {
              if (typeof fieldMapping === "string" && value === true) {
                const checkboxField = form.getFieldMaybe(fieldMapping);
                if (checkboxField instanceof PDFCheckBox) {
                  checkboxField.check();
                }
              }
              continue;
            }

            // Handle signature and location
            if (key === "SIGNATURE" && value && Array.isArray(value)) {
              const signatureField = config.form_field;
              if (typeof signatureField === "object") {
                const { x, y, maxHeight } = fieldMapping as {
                  x: number;
                  y: number;
                  maxHeight: number;
                };
                const attachmentId = Number(value[0]);
                const imageBytes = await downloadAttachment(attachmentId);
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
              continue;
            }

            if (
              key === "AUTRES_DEPENSES" &&
              typeof fieldMapping === "object" &&
              value !== "" &&
              fieldMapping &&
              "Autre" in fieldMapping &&
              "Precision" in fieldMapping
            ) {
              const otherField = form.getFieldMaybe(fieldMapping["Autre"]);
              if (otherField instanceof PDFCheckBox) {
                otherField.check();
              }

              const precisionField = form.getFieldMaybe(
                fieldMapping["Precision"],
              );
              if (precisionField instanceof PDFTextField) {
                precisionField.setText(String(value));
              }
            }

            // Handle regular text fields
            if (typeof fieldMapping === "string" && value) {
              const field = form.getFieldMaybe(fieldMapping);
              if (field instanceof PDFTextField) {
                field.setText(String(value));
              }
            }
          } catch (fieldError) {
            console.warn(`Error filling field for ${columnId}:`, fieldError);
          }
        }

        const updatedPdfBytes = await pdfDoc.save();
        setCompletePdfBytes(updatedPdfBytes);

        // Generate preview
        const previewDoc = await PDFDocument.load(updatedPdfBytes);
        const previewBytes = await createPreview(previewDoc);
        const blob = new Blob([previewBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error("Error loading PDF:", error);
      setFeedbackMessage({
        type: "error",
        message: "Échec du chargement du PDF. Veuillez réessayer.",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 2000);
    }
  }, [gristData]);

  const savePdf = async () => {
    if (!completePdfBytes || !gristData) return;

    try {
      setIsProcessing(true);
      await savePdfToGrist(
        completePdfBytes,
        gristData,
        COLUMN_MAPPING_NAMES.PDF_OUTPUT.name,
        "expense_filled",
      );
      setFeedbackMessage({
        type: "success",
        message: "PDF enregistré avec succès !",
      });
    } catch (error) {
      console.error("Error saving PDF:", error);
      setFeedbackMessage({
        type: "error",
        message: "Échec de l'enregistrement du PDF",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 2000);
    }
  };

  useEffect(() => {
    if (gristData) {
      loadPdf();
    }
  }, [loadPdf, gristData]);

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
            alt="enregistrement unique"
          />
          <div className="error-message">
            <p>{NO_DATA_MESSAGES.NO_RECORDS}</p>
          </div>
        </div>
        <Footer dataSource={<span>OM Filler propulsé par pdf-lib</span>} />
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
        <Footer dataSource={<span>OM Filler propulsé par pdf-lib</span>} />
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
        {isProcessing && <div>Traitement en cours...</div>}
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
                  Enregistrer dans Grist
                </button>
              )}
            </div>
          </>
        ) : (
          <div>Chargement de l'aperçu...</div>
        )}
      </div>
      <Footer dataSource={<span>OM Filler propulsé par pdf-lib</span>} />
    </div>
  );
};

export default AgentExpenseWidget;
