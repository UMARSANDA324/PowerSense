/**
 * Litha Deterministic Intent Detection Engine (Bilingual English/Hausa)
 */
export const detectIntent = (query) => {
  const q = (query || "").toLowerCase().trim();

  // 1. STATISTICS: outage statistics, most affected areas, weekly/monthly analytics, kididdiga
  if (
    q.includes("statistic") ||
    q.includes("analytics") ||
    q.includes("most affected") ||
    q.includes("weekly summary") ||
    q.includes("monthly summary") ||
    q.includes("kididdiga") ||
    q.includes("kididdigar")
  ) {
    return "STATISTICS";
  }

  // 2. TRANSFORMER: transformer, spark, failure, transformer explode
  if (
    q.includes("transformer") ||
    q.includes("trafo") ||
    q.includes("spark") ||
    q.includes("haskawa") ||
    q.includes("walkiya") ||
    q.includes("walƙiya") ||
    q.includes("blown")
  ) {
    return "TRANSFORMER";
  }

  // 3. LOW_VOLTAGE: low voltage, wuta tana rawa, karancin voltage, drop
  if (
    q.includes("low voltage") ||
    q.includes("fluctuation") ||
    q.includes("rawa") ||
    q.includes("karancin voltage") ||
    q.includes("voltag") ||
    q.includes("drop")
  ) {
    return "LOW_VOLTAGE";
  }

  // 3b. VOLTAGE_STATUS: current voltage, what is the voltage, voltage now, is voltage safe
  if (
    q.includes("current voltage") ||
    q.includes("what is the voltage") ||
    q.includes("voltage now") ||
    q.includes("voltage level") ||
    q.includes("is voltage safe") ||
    q.includes("voltage quality") ||
    q.includes("power quality") ||
    q.includes("voltage stable") ||
    q.includes("voltage unstable") ||
    q.includes("power surge") ||
    q.includes("surge") ||
    q.includes("voltage spike") ||
    q.includes("voltage drop") ||
    q.includes("karancin lantarki") ||
    q.includes("ƙarfin lantarki")
  ) {
    return "VOLTAGE_STATUS";
  }

  // 3c. APPLIANCE_SAFETY: fridge, AC, appliance safe, disconnect, is my fridge safe, tv safe
  if (
    q.includes("fridge") ||
    q.includes("refrigerator") ||
    q.includes("freezer") ||
    q.includes("air condition") ||
    q.includes(" ac ") ||
    q.includes("computer") ||
    q.includes("inverter") ||
    q.includes("water pump") ||
    q.includes("television") ||
    q.includes(" tv ") ||
    q.includes("appliance") ||
    q.includes("safe to use") ||
    q.includes("disconnect") ||
    q.includes("unplug") ||
    q.includes("kayan lantarki") ||
    q.includes("kayan gida")
  ) {
    return "APPLIANCE_SAFETY";
  }

  // 4. REPORT_ANALYSIS: reports count, complaints, how many complaints, reports nawa, user reports
  if (
    q.includes("complaint") ||
    q.includes("report") ||
    q.includes("korafe") ||
    q.includes("nawa aka samu")
  ) {
    return "REPORT_ANALYSIS";
  }

  // 5. PREDICTION: prediction, forecast, will there be outage, akwai yiwuwar matsala, risk forecast, prediction confidence
  if (
    q.includes("predict") ||
    q.includes("forecast") ||
    q.includes("yiwuwar") ||
    q.includes("yiwuwa") ||
    q.includes("hasashe")
  ) {
    return "PREDICTION";
  }

  // 6. FEEDER_HEALTH: healthy, stable, lafiya, lafiyar, stability, risk level, health score
  if (
    q.includes("health") ||
    q.includes("stable") ||
    q.includes("lafiya") ||
    q.includes("lafiyar") ||
    q.includes("stability")
  ) {
    return "FEEDER_HEALTH";
  }

  // 7. MAINTENANCE_DETAILS: why is maintenance, gyara, gyarawa, what maintenance, maintenance details, me ake gyarawa
  if (
    q.includes("maintenance reason") ||
    q.includes("why is maintenance") ||
    q.includes("gyara") ||
    q.includes("gyarawa") ||
    q.includes("me ake")
  ) {
    return "MAINTENANCE_DETAILS";
  }

  // 8. RESTORATION_TIME: when will power, return, restore, yaushe wuta, yaushe za a, restore time, expected restoration
  if (
    q.includes("when") ||
    q.includes("return") ||
    q.includes("restore") ||
    q.includes("yaushe") ||
    q.includes("dawo") ||
    q.includes("maido")
  ) {
    return "RESTORATION_TIME";
  }

  // 9. OUTAGE_CAUSE: why is there no light, me yasa babu wuta, blackout, no electricity, offline, outage
  if (
    q.includes("no light") ||
    q.includes("outage") ||
    q.includes("blackout") ||
    q.includes("babu wuta") ||
    q.includes("yasa babu") ||
    q.includes("matsalar wuta") ||
    q.includes("why") ||
    q.includes("yasa") ||
    q.includes("no electricity")
  ) {
    return "OUTAGE_CAUSE";
  }

  // 10. Fallback
  return "GENERAL_CHAT";
};

export default { detectIntent };
