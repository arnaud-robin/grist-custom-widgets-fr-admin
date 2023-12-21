"use client";

import { FC } from "react";
import { NormalizedGeocodeResult } from "./types";
import { RowRecord } from "grist/GristData";
import { WidgetColumnMap } from "grist/CustomSectionAPI";
import { COLUMN_MAPPING_NAMES } from "./constants";
import dynamic from "next/dynamic";
import { DirtyRecord, NoResultRecord } from "../../lib/util/types";
import GenericChoiceBanner from "../../components/GenericChoiceBanner";
import RecordName from "../../components/RecordName";
import GenericSpecificProcessing from "../../components/GenericSpecificProcessing";

// react-leaflet is relies on browser APIs window. Dynamically load the component on the client side desabling ssr
const MyAwesomeMap = dynamic(() => import("./Map"), { ssr: false });
const DynamicMarker = dynamic(() => import("./DynamicMarker"), { ssr: false });
const ChoiceDynamicMarker = dynamic(() => import("./ChoiceDynamicMarker"), {
  ssr: false,
});

export const SpecificProcessing: FC<{
  mappings: WidgetColumnMap | null;
  record: RowRecord | null | undefined;
  dirtyData: DirtyRecord<NormalizedGeocodeResult> | null | undefined;
  noResultData: NoResultRecord<NormalizedGeocodeResult> | null | undefined;
  passDataFromDirtyToClean: (
    inseeCodeSelected: NormalizedGeocodeResult,
    initalData: DirtyRecord<NormalizedGeocodeResult>,
  ) => void;
  recordResearch: () => void;
  goBackToMenu: () => void;
}> = ({
  mappings,
  record,
  dirtyData,
  noResultData,
  passDataFromDirtyToClean,
  recordResearch,
  goBackToMenu,
}) => {
  const recordNameNode = (
    <RecordName
      record={record}
      columnName={mappings && mappings[COLUMN_MAPPING_NAMES.ADDRESS.name]}
    />
  );

  const isResultFind = () => {
    if (record && mappings) {
      const columnNameLat = mappings[COLUMN_MAPPING_NAMES.LATITUDE.name];
      const columnNameLng = mappings[COLUMN_MAPPING_NAMES.LONGITUDE.name];
      if (
        typeof columnNameLat === "string" &&
        typeof columnNameLng === "string" &&
        record[columnNameLat] &&
        record[columnNameLng]
      ) {
        return true;
      }
    }
    return false;
  };

  const recordFindNode = record && (
    <MyAwesomeMap>
      <DynamicMarker mappings={mappings} record={record} />
    </MyAwesomeMap>
  );

  const choiceBannerNode = record && dirtyData && (
    <GenericChoiceBanner<NormalizedGeocodeResult>
      dirtyData={dirtyData}
      passDataFromDirtyToClean={passDataFromDirtyToClean}
      option={{
        choiceValueKey: "address_nomalized",
        withChoiceTagLegend: false,
        choiceTagLegend: "",
        choiceTagKey: "",
      }}
      itemDisplay={(item: NormalizedGeocodeResult) => (
        <div>
          <b>{item.address_nomalized}</b>
          {item.departement && ` - ${item.departement}`}
        </div>
      )}
      selectedDisplay={(selected: NormalizedGeocodeResult) => (
        <MyAwesomeMap>
          <ChoiceDynamicMarker address={selected} />
        </MyAwesomeMap>
      )}
    />
  );

  return (
    <GenericSpecificProcessing<NormalizedGeocodeResult>
      record={record}
      recordNameNode={recordNameNode}
      noResultData={noResultData}
      recordResearch={recordResearch}
      goBackToMenu={goBackToMenu}
      isResultFind={isResultFind}
      recordFindNode={recordFindNode}
      choiceBannerNode={choiceBannerNode}
    />
  );
};
