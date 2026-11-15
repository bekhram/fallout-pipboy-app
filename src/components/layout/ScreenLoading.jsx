import React from "react";
import { useTranslation } from "react-i18next";

export default function ScreenLoading() {
  const { t } = useTranslation();
  return <div className="pip-panel pip-block" role="status">{t("common.loadingScreen")}</div>;
}
