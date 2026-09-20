export type Language = 'th' | 'en';

export interface TranslationDictionary {
  common: {
    statusNormal: string;
    statusJam: string;
    statusFault: string;
    statusNoMaterial: string;
    statusMaintenance: string;
    catProduction: string;
    catUnplannedDowntime: string;
    catPlannedMaintenance: string;
    catIdle: string;
    justNow: string;
    secondsAgo: string;
    minutesAgo: string;
    close: string;
    copy: string;
    copied: string;
    all: string;
  };
  nav: {
    brandTag: string;
    brandSubtitle: string;
    tabHome: string;
    tabMonitor: string;
    tabAnalytics: string;
    tabOperations: string;
    lineFilter: string;
    liveBeacon: string;
    connectingBeacon: string;
    muteSound: string;
    enableSound: string;
    runEtl: string;
    runningEtl: string;
    refreshAll: string;
    etlSuccessToast: (rows: number, sec: number) => string;
    etlErrorToast: string;
  };
  home: {
    architectureBadge: string;
    heroTitle: string;
    heroSubtitleHighlight: string;
    heroDescription: string;
    btnLaunchMonitor: string;
    btnViewAnalytics: string;
    btnManagePipeline: string;
    statOeeTitle: string;
    statOeeSubtitle: string;
    statOutputTitle: string;
    statOutputSubtitle: (good: number, scrap: number) => string;
    statMachinesTitle: string;
    statMachinesSubtitle: string;
    statDbTitle: string;
    statDbSubtitle: string;
    guideTitle: string;
    guideSubtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
    oeeSectionTitle: string;
    oeeSectionSubtitle: string;
    pillarAvailabilityTitle: string;
    pillarAvailabilityFormula: string;
    pillarAvailabilityDesc: string;
    pillarPerformanceTitle: string;
    pillarPerformanceFormula: string;
    pillarPerformanceDesc: string;
    pillarQualityTitle: string;
    pillarQualityFormula: string;
    pillarQualityDesc: string;
    oeeFormulaSummary: string;
    oeeBenchmarkNotice: string;
    runbookTitle: string;
    runbookSubtitle: string;
  };
  monitor: {
    alertCriticalHeader: string;
    alertDowntimeItem: (line: string, machine: string, status: string, duration: number) => string;
    alertDefectItem: (line: string, machine: string, count: number) => string;
    dismissAlert: string;
    kpiScopeLabel: string;
    kpiScopeNotice: (scope: string) => string;
    kpiSyncNotice: string;
    kpiOeeTitle: string;
    kpiOutputTitle: string;
    kpiScrapTitle: string;
    kpiLostTimeTitle: string;
    kpiHealthTitle: string;
    kpiUnitsProduced: string;
    kpiThresholdScrap: string;
    kpiStoppageDuration: string;
    kpiActiveLabel: string;
    kpiDownCount: (count: number) => string;
    kpiAllOperating: string;
    machineHealthTitle: string;
    machineHealthUnits: (count: number) => string;
    machineFilterTip: string;
    filteredChip: (name: string) => string;
    ingestedNotice: (id: number) => string;
    cycleLabel: string;
    targetLabel: string;
    recent5Cycles: string;
    oldestToNew: string;
    tableTitle: string;
    tableSubtitle: string;
    searchPlaceholder: string;
    showingRows: (name: string) => string;
    colEventId: string;
    colTime: string;
    colLine: string;
    colMachine: string;
    colStatus: string;
    colGood: string;
    colDefect: string;
    colCycle: string;
    newBadge: string;
    noEvents: string;
    showingCount: (current: number, total: number) => string;
    wsSyncedNotice: string;
    btnClearTelemetry: string;
    confirmClearTelemetryTitle: string;
    confirmClearTelemetryDesc: string;
    btnConfirmClearTelemetry: string;
    clearTelemetrySuccess: string;
  };
  analytics: {
    pageTitle: string;
    pageSubtitle: string;
    activeScope: string;
    chartTitle: string;
    chartSubtitle: string;
    viewLine: string;
    viewSplit: string;
    viewBar: string;
    viewMatrix: string;
    viewSplitDesc: string;
    metricOee: string;
    metricAvailability: string;
    metricPerformance: string;
    metricQuality: string;
    isolateFilter: string;
    isolateSoloMode: string;
    cardLatest: string;
    cardAvg: string;
    cardMin: string;
    cardMax: string;
    showAllLines: (count: number) => string;
    target85Line: string;
    lineAverage: string;
    noData: string;
    noDataSub: string;
    pillarSectionTitle: string;
    pillarSectionSubtitle: string;
    pillarFormula: string;
    benchmarksTitle: string;
    colMachineType: string;
    colTargetCycle: string;
    colHourlyRate: string;
    colTolerance: string;
    thresholdsTitle: string;
    thresholdWorldClass: string;
    thresholdTypical: string;
    thresholdLow: string;
    btnClearOeeData: string;
    confirmClearOeeTitle: string;
    confirmClearOeeDesc: string;
    btnConfirmClearOee: string;
    clearOeeSuccess: string;
  };
  operations: {
    pageTitle: string;
    pageSubtitle: string;
    btnRefreshLogs: string;
    cardEtlTitle: string;
    cardEtlSubtitle: string;
    btnTriggerEtl: string;
    btnExecutingEtl: string;
    etlExplainer: string;
    dbCardTitle: string;
    dbName: string;
    dbPort: string;
    dbTables: string;
    dbState: string;
    dbActive: string;
    logsSectionTitle: string;
    logsSectionSubtitle: string;
    recentRunsCount: (count: number) => string;
    colLogId: string;
    colPipeline: string;
    colStartTime: string;
    colEndTime: string;
    colStatus: string;
    colRowsUpserted: string;
    colErrorDetails: string;
    noLogs: string;
    loadingLogs: string;
    btnResetLogs: string;
    confirmResetTitle: string;
    confirmResetDesc: string;
    btnConfirmReset: string;
    btnCancel: string;
    resetSuccessToast: string;
    resetErrorToast: string;
    runbookTitle: string;
    runbookSubtitle: string;
  };
  footer: {
    appName: string;
    techStack: string;
    dbStatus: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  th: {
    common: {
      statusNormal: 'ทำงานปกติ (Normal)',
      statusJam: 'เครื่องติดขัด (Jam)',
      statusFault: 'เซนเซอร์ผิดพลาด (Fault)',
      statusNoMaterial: 'ขาดวัตถุดิบ (Idle)',
      statusMaintenance: 'ซ่อมบำรุง (Maintenance)',
      catProduction: 'การผลิต (Production)',
      catUnplannedDowntime: 'หยุดฉุกเฉิน (Downtime)',
      catPlannedMaintenance: 'ซ่อมบำรุง (Planned)',
      catIdle: 'หยุดพัก (Idle)',
      justNow: 'เมื่อสักครู่',
      secondsAgo: 's ที่แล้ว',
      minutesAgo: 'm ที่แล้ว',
      close: 'ปิด',
      copy: 'คัดลอก',
      copied: 'คัดลอกแล้ว',
      all: 'ทั้งหมด',
    },
    nav: {
      brandTag: 'IIoT Core',
      brandSubtitle: 'ระบบสตรีมข้อมูลโรงงาน & วิเคราะห์ OEE',
      tabHome: 'หน้าหลัก',
      tabMonitor: 'เฝ้าระวังสด',
      tabAnalytics: 'วิเคราะห์ OEE',
      tabOperations: 'ไปป์ไลน์ & Logs',
      lineFilter: 'สายผลิต:',
      liveBeacon: 'Live',
      connectingBeacon: 'Connecting',
      muteSound: 'ปิดเสียงเตือน',
      enableSound: 'เปิดเสียงเตือน',
      runEtl: 'รัน Batch ETL',
      runningEtl: 'กำลังประมวลผล...',
      refreshAll: 'รีเฟรชข้อมูล',
      etlSuccessToast: (rows, sec) => `ประมวลผล ETL สำเร็จ: ${rows} แถว ใน ${sec}s`,
      etlErrorToast: 'การรัน ETL ล้มเหลว',
    },
    home: {
      architectureBadge: 'Lambda / Hybrid Telemetry Architecture',
      heroTitle: 'ระบบวิศวกรรมข้อมูลอัจฉริยะสำหรับ',
      heroSubtitleHighlight: 'Industrial IoT & OEE Analytics',
      heroDescription: 'สตรีมสัญญาณเซนเซอร์ Edge แบบเสี้ยววินาที วิเคราะห์ประสิทธิผลเครื่องจักร (OEE) รายชั่วโมง และตรวจจับความผิดปกติของสายการผลิตแบบอัตโนมัติ',
      btnLaunchMonitor: 'เปิดระบบเฝ้าระวังสด',
      btnViewAnalytics: 'วิเคราะห์ข้อมูล OEE',
      btnManagePipeline: 'จัดการ Pipeline',
      statOeeTitle: 'ดัชนี Plant OEE',
      statOeeSubtitle: '● คำนวณสดจาก Data Mart',
      statOutputTitle: 'ยอดการผลิตรวม',
      statOutputSubtitle: (good, scrap) => `ชิ้นงานดี: ${good.toLocaleString()} | ของเสีย: ${scrap.toLocaleString()}`,
      statMachinesTitle: 'เครื่องจักรที่ทำงาน',
      statMachinesSubtitle: 'LINE_01 & LINE_02 (6 เครื่อง)',
      statDbTitle: 'PostgreSQL 15',
      statDbSubtitle: '● Connected Port 5432',
      guideTitle: 'แนวทางการทำงานของระบบ (System Workflow)',
      guideSubtitle: 'เชื่อมต่อตั้งแต่สัญญาณ Edge Sensor สดไปจนถึงการวิเคราะห์ OEE เชิงลึก',
      step1Title: '1. Ingestion — สตรีมสัญญาณเซนเซอร์',
      step1Desc: 'จำลองสัญญาณ PLC ส่งรอบการผลิต Good/Defect ทุก 2 วินาทีเข้าสู่ระบบผ่าน Python Generator',
      step2Title: '2. Live Monitor — เฝ้าระวังแบบ Real-time',
      step2Desc: 'ดูสถานะการเดินเครื่อง 6 หน่วย พร้อมไฟสัญญาณกระพริบ และเสียงเตือนอัตโนมัติเมื่อเกิดเหตุขัดข้อง',
      step3Title: '3. Analytics — เจาะลึกแนวโน้ม OEE',
      step3Desc: 'เลือกดูกราฟ Line, Bar หรือ Heatmap Matrix พร้อมแยกวิเคราะห์ 3 เสาหลัก A / P / Q รายเครื่องจักร',
      step4Title: '4. Operations — คำนวณ Batch & Audit Logs',
      step4Desc: 'สั่งรันประมวลผล Batch ETL สรุปผลรายชั่วโมงเข้า Data Mart พร้อมตรวจสอบประวัติการรันในตาราง Logs',
      oeeSectionTitle: 'หลักการคำนวณ OEE (Overall Equipment Effectiveness)',
      oeeSectionSubtitle: 'มาตรฐานสากลในการวัดประสิทธิภาพการผลิต ประกอบด้วย 3 องค์ประกอบหลัก',
      pillarAvailabilityTitle: '1. Availability (ความพร้อม)',
      pillarAvailabilityFormula: 'เวลาเดินเครื่องจริง / เวลาที่วางแผนไว้',
      pillarAvailabilityDesc: 'วัดเวลาที่สูญเสียจากการหยุดฉุกเฉิน (Unplanned Downtime) เช่น เครื่องติดขัด หรือเซนเซอร์ขัดข้อง',
      pillarPerformanceTitle: '2. Performance (ประสิทธิภาพ)',
      pillarPerformanceFormula: 'เวลามาตรฐาน × ยอดผลิต / เวลาเดินเครื่องจริง',
      pillarPerformanceDesc: 'วัดความเร็วการผลิตเทียบเกณฑ์เวลามาตรฐาน (Target Cycle: CNC_A=12s, CNC_B=15s, Robot=8s)',
      pillarQualityTitle: '3. Quality (คุณภาพชิ้นงาน)',
      pillarQualityFormula: 'ยอดชิ้นงานดี / ยอดผลิตทั้งหมด',
      pillarQualityDesc: 'วัดสัดส่วนของชิ้นงานที่ผ่านมาตรฐานโดยไม่มีการ Reject หรือของเสีย',
      oeeFormulaSummary: 'OEE (%) = (Availability × Performance × Quality) / 10,000',
      oeeBenchmarkNotice: 'มาตรฐานสากล World Class: ≥ 85.0%',
      runbookTitle: 'Terminal Runbook คำสั่งพร้อมใช้งาน',
      runbookSubtitle: 'คัดลอกคำสั่งไปรันใน PowerShell หรือ Bash เพื่อควบคุมระบบ',
    },
    monitor: {
      alertCriticalHeader: '[CRITICAL ALERT]:',
      alertDowntimeItem: (line, machine, status, duration) => `🔴 ${line} / ${machine}: เครื่องหยุด (${status} - สูญเสีย ${duration.toFixed(1)}s)`,
      alertDefectItem: (line, machine, count) => `⚠️ ${line} / ${machine}: พบของเสีย (${count} ชิ้น)`,
      dismissAlert: 'รับทราบ',
      kpiScopeLabel: 'Scope:',
      kpiScopeNotice: (scope) => `(คำนวณเฉพาะสาย ${scope})`,
      kpiSyncNotice: 'Synced with Edge Telemetry',
      kpiOeeTitle: 'Plant OEE Index',
      kpiOutputTitle: 'ยอดผลิตรวม',
      kpiScrapTitle: 'อัตราของเสีย',
      kpiLostTimeTitle: 'เวลาที่สูญเสีย',
      kpiHealthTitle: 'สถานะเครื่องจักร',
      kpiUnitsProduced: 'จำนวนชิ้นงานทั้งหมด',
      kpiThresholdScrap: 'เกณฑ์ควบคุม: < 2.0%',
      kpiStoppageDuration: 'ระยะเวลาเครื่องหยุด',
      kpiActiveLabel: 'Active',
      kpiDownCount: (count) => `● ขัดข้อง ${count} เครื่อง`,
      kpiAllOperating: '● ปกติทุกเครื่อง',
      machineHealthTitle: 'Live Machine Health',
      machineHealthUnits: (count) => `(${count} เครื่อง)`,
      machineFilterTip: 'นำเมาส์ชี้หรือคลิกการ์ดเพื่อกรองข้อมูล',
      filteredChip: (name) => `กรอง: ${name}`,
      ingestedNotice: (id) => `#${id} INGESTED`,
      cycleLabel: 'Cycle:',
      targetLabel: 'Tgt:',
      recent5Cycles: '5 รอบล่าสุด:',
      oldestToNew: 'เก่าสุด → ล่าสุด',
      tableTitle: 'Recent Telemetry Feed',
      tableSubtitle: 'สตรีมสัญญาณเซนเซอร์ Edge สดแบบเรียลไทม์',
      searchPlaceholder: 'ค้นหาเครื่องจักร/สถานะ...',
      showingRows: (name) => `แสดงเฉพาะ ${name}`,
      colEventId: 'ID',
      colTime: 'เวลา',
      colLine: 'สายผลิต',
      colMachine: 'เครื่องจักร',
      colStatus: 'สถานะ',
      colGood: 'ชิ้นงานดี',
      colDefect: 'ของเสีย',
      colCycle: 'Cycle (s)',
      newBadge: 'NEW',
      noEvents: 'ไม่พบข้อมูลตามเงื่อนไข',
      showingCount: (current, total) => `แสดง ${current} จาก ${total} รายการ`,
      wsSyncedNotice: 'WebSocket Sub-second Sync',
      btnClearTelemetry: 'ล้างข้อมูลจำลอง',
      confirmClearTelemetryTitle: 'ยืนยันการล้างข้อมูลจำลอง Telemetry',
      confirmClearTelemetryDesc: 'คุณต้องการล้างข้อมูลสัญญาณเซนเซอร์จำลองทั้งหมดในตาราง machine_telemetry ใช่หรือไม่? (หมายเลข ID จะถูกรีเซ็ตกลับเป็น #1 และตารางจะพร้อมรับสัญญาณรอบใหม่)',
      btnConfirmClearTelemetry: 'ยืนยันล้างข้อมูลจำลอง',
      clearTelemetrySuccess: 'ล้างข้อมูลจำลอง Telemetry สำเร็จแล้ว (Event ID เริ่มต้นที่ #1)',
    },
    analytics: {
      pageTitle: 'OEE Analytics & Diagnostics',
      pageSubtitle: 'วิเคราะห์เชิงลึก 3 เสาหลัก: ความพร้อม (A), ประสิทธิภาพ (P), และคุณภาพ (Q)',
      activeScope: 'Active Scope:',
      chartTitle: 'Hourly OEE Trend',
      chartSubtitle: 'ประมวลผลจากตาราง Data Mart',
      viewLine: 'เส้นรวม (Line)',
      viewSplit: 'แยกเครื่อง (Split)',
      viewBar: 'กราฟแท่ง (Bar)',
      viewMatrix: 'ตาราง (Matrix)',
      viewSplitDesc: 'แยกกราฟอิสระรายเครื่องจักร ชัดเจน ไม่ซ้อนทับกัน',
      metricOee: 'OEE (%)',
      metricAvailability: 'Availability (A)',
      metricPerformance: 'Performance (P)',
      metricQuality: 'Quality (Q)',
      isolateFilter: 'กรองกลุ่ม:',
      isolateSoloMode: 'เลือกดูเฉพาะเครื่อง:',
      cardLatest: 'ล่าสุด',
      cardAvg: 'เฉลี่ย',
      cardMin: 'ต่ำสุด',
      cardMax: 'สูงสุด',
      showAllLines: (count) => `แสดงทั้งหมด (${count} ซ่อนอยู่) ↺`,
      target85Line: 'เป้าหมาย 85%',
      lineAverage: 'Line Average',
      noData: 'ไม่พบข้อมูล OEE',
      noDataSub: 'สั่งรัน Batch ETL เพื่อประมวลผลข้อมูลรายชั่วโมง',
      pillarSectionTitle: 'Pillar Breakdown Analysis (A / P / Q)',
      pillarSectionSubtitle: 'เปรียบเทียบสัดส่วนเสาหลักของแต่ละเครื่องจักรในชั่วโมงล่าสุด',
      pillarFormula: 'OEE = (A × P × Q) / 10,000',
      benchmarksTitle: 'Target Ideal Cycle Times (เกณฑ์เวลามาตรฐาน)',
      colMachineType: 'ประเภทเครื่องจักร',
      colTargetCycle: 'เวลามาตรฐาน',
      colHourlyRate: 'กำลังผลิต/ชม.',
      colTolerance: 'ค่าความคลาดเคลื่อน',
      thresholdsTitle: 'World Class Manufacturing OEE Thresholds',
      thresholdWorldClass: '≥ 85.0% - World Class: ระดับสากล มีความสามารถแข่งขันสูง',
      thresholdTypical: '60.0% - 84.9% - Typical: ระดับทั่วไป มีโอกาสพัฒนาลดต้นทุน',
      thresholdLow: '< 60.0% - Low: ต้องปรับปรุงเร่งด่วน สูญเสียจากเครื่องหยุดหรือของเสียสูง',
      btnClearOeeData: 'ล้างข้อมูลกราฟ OEE',
      confirmClearOeeTitle: 'ยืนยันการล้างข้อมูลกราฟ OEE ใน Data Mart',
      confirmClearOeeDesc: 'คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลสรุป OEE รายชั่วโมงทั้งหมดในตาราง hourly_production_summary? กราฟแนวโน้ม OEE ทั้งหมดจะถูกรีเซ็ต (คุณสามารถสั่งรัน Batch ETL หรือ Seed ประวัติใหม่ได้ตลอดเวลา)',
      btnConfirmClearOee: 'ยืนยันล้างข้อมูล OEE',
      clearOeeSuccess: 'ล้างข้อมูล OEE ใน Data Mart สำเร็จแล้ว กราฟถูกรีเซ็ตเรียบร้อย',
    },
    operations: {
      pageTitle: 'Data Pipeline Operations & Auditing',
      pageSubtitle: 'สั่งรันคำนวณ Batch ETL ตรวจสอบสถานะฐานข้อมูล และประวัติ Audit Logs',
      btnRefreshLogs: 'รีเฟรช Logs',
      cardEtlTitle: 'Hourly OEE Batch Pipeline (Batch Layer)',
      cardEtlSubtitle: 'รวบรวม Telemetry คำนวณ A / P / Q และ Upsert เข้า Data Mart',
      btnTriggerEtl: 'สั่งรัน Batch ETL ทันที →',
      btnExecutingEtl: 'กำลังประมวลผล...',
      etlExplainer: 'เมื่อสั่งรัน ระบบจะอ่านข้อมูลดิบจาก telemetry_events จัดกลุ่มตามชั่วโมงและเครื่องจักร คำนวณ OEE จากนั้น Upsert เข้าตาราง hourly_oee และบันทึกประวัติลง pipeline_execution_logs',
      dbCardTitle: 'PostgreSQL Database Architecture',
      dbName: 'Database:',
      dbPort: 'Host / Port:',
      dbTables: 'Tables:',
      dbState: 'State:',
      dbActive: 'Active & Synced',
      logsSectionTitle: 'Pipeline Execution Audit Logs',
      logsSectionSubtitle: 'ประวัติการประมวลผลจากตาราง pipeline_execution_logs',
      recentRunsCount: (count) => `${count} รายการล่าสุด`,
      colLogId: 'Log ID',
      colPipeline: 'ไปป์ไลน์',
      colStartTime: 'เวลาเริ่ม',
      colEndTime: 'เวลาสิ้นสุด',
      colStatus: 'สถานะ',
      colRowsUpserted: 'แถวที่บันทึก',
      colErrorDetails: 'ข้อผิดพลาด',
      noLogs: 'ไม่มีบันทึกประวัติ',
      loadingLogs: 'กำลังโหลด...',
      btnResetLogs: 'ล้างประวัติ Logs',
      confirmResetTitle: 'ยืนยันการล้างประวัติบันทึก Logs',
      confirmResetDesc: 'คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติการทำงานของไปป์ไลน์ทั้งหมดในตาราง pipeline_execution_logs? หมายเลข Log ID จะถูกรีเซ็ตกลับเป็น #1',
      btnConfirmReset: 'ยืนยันล้างประวัติ',
      btnCancel: 'ยกเลิก',
      resetSuccessToast: 'ล้างประวัติบันทึก Logs สำเร็จแล้ว (Log ID รีเซ็ตเริ่มต้นที่ #1)',
      resetErrorToast: 'ไม่สามารถล้างประวัติได้ กรุณาลองใหม่อีกครั้ง',
      runbookTitle: 'Terminal CLI Runbook',
      runbookSubtitle: 'คำสั่ง PowerShell / Bash สำหรับควบคุมระบบ',
    },
    footer: {
      appName: 'FactoryPulse — Manufacturing Operations',
      techStack: 'FastAPI • React 18 • PostgreSQL 15 • WebSocket',
      dbStatus: 'PostgreSQL 15 Connected • Port 5432 • Real-time Synced',
    },
  },
  en: {
    common: {
      statusNormal: 'Running Normal',
      statusJam: 'Mechanical Jam',
      statusFault: 'Sensor Fault',
      statusNoMaterial: 'No Material',
      statusMaintenance: 'Scheduled Maintenance',
      catProduction: 'Production',
      catUnplannedDowntime: 'Unplanned Downtime',
      catPlannedMaintenance: 'Planned Maintenance',
      catIdle: 'Idle / Waiting',
      justNow: 'Just now',
      secondsAgo: 's ago',
      minutesAgo: 'm ago',
      close: 'Close',
      copy: 'Copy',
      copied: 'Copied',
      all: 'ALL',
    },
    nav: {
      brandTag: 'IIoT Core',
      brandSubtitle: 'Industrial Telemetry & Real-Time OEE Analytics',
      tabHome: 'Home',
      tabMonitor: 'Live Monitor',
      tabAnalytics: 'OEE Analytics',
      tabOperations: 'Pipeline & Logs',
      lineFilter: 'Line:',
      liveBeacon: 'Live',
      connectingBeacon: 'Connecting',
      muteSound: 'Mute Audio Alarms',
      enableSound: 'Enable Audio Alarms',
      runEtl: 'Run Batch ETL',
      runningEtl: 'Processing...',
      refreshAll: 'Refresh Data',
      etlSuccessToast: (rows, sec) => `ETL Pipeline Complete: ${rows} records in ${sec}s`,
      etlErrorToast: 'ETL Pipeline execution failed',
    },
    home: {
      architectureBadge: 'Lambda / Hybrid Telemetry Architecture',
      heroTitle: 'The living pipeline of',
      heroSubtitleHighlight: 'industrial intelligence',
      heroDescription: 'Sub-second sensor telemetry streaming, automated hourly OEE analytics, and autonomous shopfloor anomaly detection built for modern manufacturing.',
      btnLaunchMonitor: 'Launch Live Monitor',
      btnViewAnalytics: 'Explore OEE Analytics',
      btnManagePipeline: 'Manage Pipeline',
      statOeeTitle: 'Plant OEE Index',
      statOeeSubtitle: '● Real-time Data Mart',
      statOutputTitle: 'Total Produced Units',
      statOutputSubtitle: (good, scrap) => `Good: ${good.toLocaleString()} | Scrap: ${scrap.toLocaleString()}`,
      statMachinesTitle: 'Active Monitored Units',
      statMachinesSubtitle: 'LINE_01 & LINE_02 (6 Units)',
      statDbTitle: 'PostgreSQL 15',
      statDbSubtitle: '● Connected Port 5432',
      guideTitle: 'System Operational Workflow',
      guideSubtitle: 'Seamless pipeline from edge sensor ingestion to multi-dimensional analytics',
      step1Title: '1. Ingestion — Stream Sensor Telemetry',
      step1Desc: 'Simulate shopfloor PLCs streaming Good/Defect cycles every 2 seconds via edge simulation.',
      step2Title: '2. Live Monitor — Real-Time Health',
      step2Desc: 'Inspect 6 active units with glowing beacons, audio alerts on stoppage, and live feeds.',
      step3Title: '3. Analytics — Deep-Dive OEE Trends',
      step3Desc: 'Toggle Line, Bar, and Matrix heatmaps with component breakdown for Availability, Performance, and Quality.',
      step4Title: '4. Operations — Batch Pipeline & Auditing',
      step4Desc: 'Execute hourly OEE batch aggregation and verify audit trail records in PostgreSQL.',
      oeeSectionTitle: 'Overall Equipment Effectiveness (OEE) Principles',
      oeeSectionSubtitle: 'Global manufacturing gold standard measuring availability, performance, and quality',
      pillarAvailabilityTitle: '1. Availability (A)',
      pillarAvailabilityFormula: 'Operating Time / Planned Production Time',
      pillarAvailabilityDesc: 'Measures lost time from unplanned downtime (mechanical jams, sensor faults, setup delays).',
      pillarPerformanceTitle: '2. Performance (P)',
      pillarPerformanceFormula: 'Ideal Cycle Time × Output / Operating Time',
      pillarPerformanceDesc: 'Measures speed against standard benchmark targets (CNC_A=12s, CNC_B=15s, Robot=8s).',
      pillarQualityTitle: '3. Quality (Q)',
      pillarQualityFormula: 'Good Units / Total Units Produced',
      pillarQualityDesc: 'Measures the proportion of parts meeting strict engineering quality specifications.',
      oeeFormulaSummary: 'OEE (%) = (Availability × Performance × Quality) / 10,000',
      oeeBenchmarkNotice: 'World-Class Global Benchmark: ≥ 85.0%',
      runbookTitle: 'Terminal Runbook Quick Reference',
      runbookSubtitle: 'Copy and run directly in PowerShell or Bash',
    },
    monitor: {
      alertCriticalHeader: '[CRITICAL ALERT]:',
      alertDowntimeItem: (line, machine, status, duration) => `🔴 ${line} / ${machine}: Stoppage (${status} - ${duration.toFixed(1)}s lost)`,
      alertDefectItem: (line, machine, count) => `⚠️ ${line} / ${machine}: Scrap Defect (${count} units)`,
      dismissAlert: 'Acknowledge',
      kpiScopeLabel: 'Scope:',
      kpiScopeNotice: (scope) => `(Calculated strictly for ${scope})`,
      kpiSyncNotice: 'Synced with Edge Telemetry',
      kpiOeeTitle: 'Plant OEE Index',
      kpiOutputTitle: 'Total Output',
      kpiScrapTitle: 'Scrap Rate',
      kpiLostTimeTitle: 'Lost Downtime',
      kpiHealthTitle: 'Machine Health',
      kpiUnitsProduced: 'Cumulative output units',
      kpiThresholdScrap: 'Threshold target: < 2.0%',
      kpiStoppageDuration: 'Unplanned stoppage duration',
      kpiActiveLabel: 'Active',
      kpiDownCount: (count) => `● ${count} Down`,
      kpiAllOperating: '● All units operational',
      machineHealthTitle: 'Live Machine Health',
      machineHealthUnits: (count) => `(${count} Units Monitored)`,
      machineFilterTip: 'Hover or click card to isolate telemetry rows',
      filteredChip: (name) => `Filtered: ${name}`,
      ingestedNotice: (id) => `#${id} INGESTED`,
      cycleLabel: 'Cycle:',
      targetLabel: 'Tgt:',
      recent5Cycles: 'Recent 5 Cycles:',
      oldestToNew: 'Oldest → New',
      tableTitle: 'Recent Telemetry Feed',
      tableSubtitle: 'Live Edge Event Stream (Hover row to highlight top machine)',
      searchPlaceholder: 'Search machine/status...',
      showingRows: (name) => `Showing ${name}`,
      colEventId: 'ID',
      colTime: 'Time',
      colLine: 'Line',
      colMachine: 'Machine',
      colStatus: 'Status',
      colGood: 'Good',
      colDefect: 'Defect',
      colCycle: 'Cycle (s)',
      newBadge: 'NEW',
      noEvents: 'No telemetry events matching current filter',
      showingCount: (current, total) => `Showing ${current} of ${total} records`,
      wsSyncedNotice: 'WebSocket Sub-second Sync',
      btnClearTelemetry: 'Clear Feed',
      confirmClearTelemetryTitle: 'Confirm Clear Simulated Telemetry',
      confirmClearTelemetryDesc: 'Are you sure you want to clear all simulated telemetry records from table machine_telemetry? (Event ID will restart from #1)',
      btnConfirmClearTelemetry: 'Confirm Clear Feed',
      clearTelemetrySuccess: 'Simulated telemetry cleared successfully (ID reset to #1)',
    },
    analytics: {
      pageTitle: 'OEE Analytics & Diagnostics',
      pageSubtitle: 'Multi-dimensional analysis of Availability, Performance, and Quality metrics',
      activeScope: 'Active Scope:',
      chartTitle: 'Hourly OEE Trend',
      chartSubtitle: 'Aggregated from Data Mart',
      viewLine: 'Combined Line',
      viewSplit: 'Split Cards',
      viewBar: 'Bar',
      viewMatrix: 'Matrix',
      viewSplitDesc: 'Dedicated sub-charts per machine with zero overlapping',
      metricOee: 'OEE (%)',
      metricAvailability: 'Availability (A)',
      metricPerformance: 'Performance (P)',
      metricQuality: 'Quality (Q)',
      isolateFilter: 'Filter Group:',
      isolateSoloMode: 'Solo Machine:',
      cardLatest: 'Latest',
      cardAvg: 'Avg',
      cardMin: 'Min',
      cardMax: 'Max',
      showAllLines: (count) => `Show All (${count} hidden) ↺`,
      target85Line: 'Target 85%',
      lineAverage: 'Line Average',
      noData: 'No aggregated OEE records available.',
      noDataSub: 'Run Batch ETL to generate hourly metrics.',
      pillarSectionTitle: 'Pillar Breakdown Analysis (A / P / Q)',
      pillarSectionSubtitle: 'Latest hour comparative evaluation across machines',
      pillarFormula: 'OEE = (A × P × Q) / 10,000',
      benchmarksTitle: 'Target Ideal Cycle Times (Standard Benchmarks)',
      colMachineType: 'Machine Type',
      colTargetCycle: 'Target Cycle',
      colHourlyRate: 'Standard Rate',
      colTolerance: 'Tolerance',
      thresholdsTitle: 'World Class Manufacturing OEE Thresholds',
      thresholdWorldClass: '≥ 85.0% - World Class: Exceptional efficiency, globally competitive',
      thresholdTypical: '60.0% - 84.9% - Typical: Standard performance, room for optimization',
      thresholdLow: '< 60.0% - Low: Urgent action required due to downtime or defects',
      btnClearOeeData: 'Clear OEE Data',
      confirmClearOeeTitle: 'Confirm Clear OEE Data Mart',
      confirmClearOeeDesc: 'Are you sure you want to clear all hourly OEE summary records from table hourly_production_summary? All OEE trend charts will be reset. (You can re-aggregate at any time by running Batch ETL or seeding demo history).',
      btnConfirmClearOee: 'Confirm Clear OEE Data',
      clearOeeSuccess: 'OEE Data Mart cleared successfully. Charts have been reset.',
    },
    operations: {
      pageTitle: 'Data Pipeline Operations & Auditing',
      pageSubtitle: 'Trigger Batch ETL tasks, audit execution logs, and inspect database state',
      btnRefreshLogs: 'Refresh Logs',
      cardEtlTitle: 'Hourly OEE Batch Pipeline (Batch Layer)',
      cardEtlSubtitle: 'Aggregates telemetry, computes A / P / Q, and upserts to Data Mart',
      btnTriggerEtl: 'Trigger Batch ETL Now →',
      btnExecutingEtl: 'Processing...',
      etlExplainer: 'When triggered, the pipeline reads raw telemetry from `telemetry_events`, calculates A / P / Q and OEE %, upserts into `hourly_oee`, and records audit logs in `pipeline_execution_logs`.',
      dbCardTitle: 'PostgreSQL Database Architecture',
      dbName: 'Database:',
      dbPort: 'Host / Port:',
      dbTables: 'Tables:',
      dbState: 'State:',
      dbActive: 'Active & Synced',
      logsSectionTitle: 'Pipeline Execution Audit Logs',
      logsSectionSubtitle: 'Audit trail records from database table `pipeline_execution_logs`',
      recentRunsCount: (count) => `${count} Recent Runs`,
      colLogId: 'Log ID',
      colPipeline: 'Pipeline',
      colStartTime: 'Start Time',
      colEndTime: 'End Time',
      colStatus: 'Status',
      colRowsUpserted: 'Rows Upserted',
      colErrorDetails: 'Error Details',
      noLogs: 'No execution logs recorded yet.',
      loadingLogs: 'Loading...',
      btnResetLogs: 'Clear Logs',
      confirmResetTitle: 'Confirm Reset Execution Logs',
      confirmResetDesc: 'Are you sure you want to clear all execution records from database table pipeline_execution_logs? Log ID will restart from #1.',
      btnConfirmReset: 'Confirm Clear Logs',
      btnCancel: 'Cancel',
      resetSuccessToast: 'Execution logs cleared successfully (Log ID reset to #1)',
      resetErrorToast: 'Failed to reset logs. Please try again.',
      runbookTitle: 'Terminal CLI Runbook',
      runbookSubtitle: 'PowerShell / Bash commands to control edge simulation and monitoring',
    },
    footer: {
      appName: 'FactoryPulse — Manufacturing Operations',
      techStack: 'FastAPI • React 18 • PostgreSQL 15 • WebSocket',
      dbStatus: 'PostgreSQL 15 Connected • Port 5432 • Real-time Synced',
    },
  },
};
