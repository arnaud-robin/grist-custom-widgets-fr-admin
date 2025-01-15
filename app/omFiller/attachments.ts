export const uploadAttachment = async (blob: Blob, filename: string) => {
  const tokenInfo = await grist.docApi.getAccessToken({ readOnly: false });
  const gristUrl = `${tokenInfo.baseUrl}/attachments?auth=${tokenInfo.token}`;

  const formData = new FormData();
  formData.set("upload", blob, filename);

  const gristResponse = await fetch(gristUrl, {
    method: "POST",
    body: formData,
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const response = await gristResponse.json();
  return response[0];
};

export const updateRecordWithAttachment = async (
  tableId: string,
  recordId: number,
  columnName: string,
  attachmentId: number,
) => {
  const tokenInfo = await grist.docApi.getAccessToken({ readOnly: false });
  const updateUrl = `${tokenInfo.baseUrl}/tables/${tableId}/records?auth=${tokenInfo.token}`;

  const response = await fetch(updateUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [
        {
          id: recordId,
          fields: grist.mapColumnNamesBack({
            [columnName]: [grist.GristObjCode.List, attachmentId],
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update record: ${response.statusText}`);
  }
};

export const downloadAttachment = async (
  attachmentId: number,
): Promise<ArrayBuffer> => {
  const tokenInfo = await grist.docApi.getAccessToken({ readOnly: false });
  const downloadUrl = `${tokenInfo.baseUrl}/attachments/${attachmentId}/download?auth=${tokenInfo.token}`;

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download attachment: ${response.statusText}`);
  }

  return await response.arrayBuffer();
};
