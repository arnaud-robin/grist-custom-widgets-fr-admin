import Image from "next/image";
import configurationSvg from "../../public/configuration.svg";
import { Instructions } from "./Instructions";

export const Configuration = () => {
  return (
    <div className="centered_column">
      <Image priority src={configurationSvg} alt="Configuration" />
      <p style={{ fontSize: "1.3em", lineHeight: "1.1em" }}>
        Commencer par configurer les colonnes source et destination dans les
        options du widget
      </p>
      <Instructions />
    </div>
  );
};
