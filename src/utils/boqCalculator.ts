import {
  UserDesignSelections,
  RoomDimensionsInput,
  BOQReport,
  BOQLineItem,
  PriceRecord,
  MakanProject,
} from '../types/makan';
import {
  WALL_COLORS,
  WALL_FINISHES,
  FLOORING_OPTIONS,
  CEILING_LIGHTING_OPTIONS,
  FURNITURE_CATALOG,
  EGYPTIAN_REGIONS,
  QUALITY_TIERS,
} from '../data/catalogData';

export function calculateRoomBOQ(
  selections: UserDesignSelections,
  dimensions: RoomDimensionsInput,
  priceCatalog: PriceRecord[],
  customContractorQuotes: Record<string, number> = {}
): BOQReport {
  const L = Math.max(1.5, Number(dimensions.lengthM) || 4.5);
  const W = Math.max(1.5, Number(dimensions.widthM) || 3.8);
  const H = Math.max(2.4, Number(dimensions.heightM) || 2.9);

  const floorAreaM2 = round2(L * W);
  const perimeterM = round2(2 * (L + W));
  const grossWallAreaM2 = round2(perimeterM * H);
  const openingsAreaM2 = round2(
    Math.max(0, dimensions.doorsCount * (dimensions.doorAreaM2 || 1.98)) +
      Math.max(0, dimensions.windowsCount * (dimensions.windowAreaM2 || 1.8))
  );
  const netPaintableWallAreaM2 = round2(Math.max(4, grossWallAreaM2 - openingsAreaM2));
  const ceilingAreaM2 = floorAreaM2;

  const regionObj = EGYPTIAN_REGIONS.find((r) => r.id === dimensions.region) || EGYPTIAN_REGIONS[0];
  const qualityObj = QUALITY_TIERS.find((q) => q.id === dimensions.qualityTier) || QUALITY_TIERS[1];

  const regionMult = regionObj.multiplier;
  const qualityMult = qualityObj.multiplier;

  // Determine which elements are included in this design
  const isMaskMode = selections.designPath === 'element_mask';
  const includeWalls = isMaskMode ? selections.activeMaskZones.includes('walls') : selections.modifyWalls;
  const includeFloor = isMaskMode ? selections.activeMaskZones.includes('floor') : selections.modifyFloor;
  const includeCeiling = isMaskMode ? selections.activeMaskZones.includes('ceiling') : selections.modifyCeiling;
  const includeLighting = isMaskMode ? selections.activeMaskZones.includes('lighting') : selections.modifyLighting;
  const includeFurniture = isMaskMode ? selections.activeMaskZones.includes('furniture') : selections.modifyFurniture;

  const findPriceRecord = (categoryKey: string): PriceRecord => {
    return (
      priceCatalog.find((p) => p.categoryKey === categoryKey) || {
        id: categoryKey,
        categoryKey,
        materialNameAr: 'بند تشطيب قياسي',
        categoryAr: 'الدهانات',
        unitAr: 'م²',
        qualityTier: 'standard',
        referencePriceEgp: 250,
        region: dimensions.region,
        sourceAr: 'متوسط استرشادي للسوق المصري',
        lastUpdated: '2026-10-01',
        notesAr: '',
      }
    );
  };

  const lineItems: BOQLineItem[] = [];

  // 1. Preparation if red brick
  if (dimensions.finishScope === 'red_brick_to_full') {
    const plasterArea = round2(netPaintableWallAreaM2 + ceilingAreaM2);
    const unitMat = round2(115 * regionMult);
    const unitLab = dimensions.includeLabor ? round2(95 * regionMult) : 0;
    const matTot = round2(plasterArea * unitMat);
    const labTot = round2(plasterArea * unitLab);
    lineItems.push({
      id: 'item_plaster_prep',
      categoryAr: 'تأسيس المحارة والطرطشة',
      itemNameAr: 'تأسيس محارة أسمنتية للحوائط والسقف (طرطشة وبؤج وأوتار)',
      unitAr: 'م²',
      quantity: plasterArea,
      wastePercent: 5,
      quantityWithWaste: round2(plasterArea * 1.05),
      referenceUnitPriceEgp: unitMat,
      laborUnitPriceEgp: unitLab,
      materialTotalEgp: matTot,
      laborTotalEgp: labTot,
      combinedTotalEgp: matTot + labTot,
      contractorActualQuoteEgp: customContractorQuotes['item_plaster_prep'],
      priceSourceAr: 'معدلات استهلاك الأسمنت والرمل وأجور المبيضين 2026',
      lastUpdated: '2026-10-01',
      notesAr: 'سمك المحارة المتوسط 2 سم على الطوب الأحمر.',
    });
  }

  // 2. Walls Calculation
  let paintLitersRequired = 0;
  let paintBuckets18L = 0;
  let puttyBagsRequired = 0;

  if (includeWalls) {
    const wallColor = WALL_COLORS.find((w) => w.id === selections.wallColorId) || WALL_COLORS[0];
    const wallFinish = WALL_FINISHES.find((f) => f.id === selections.wallFinishId) || WALL_FINISHES[0];

    const paintArea = round2(netPaintableWallAreaM2 + (includeCeiling ? ceilingAreaM2 : 0));
    paintLitersRequired = Math.ceil((paintArea / 11) * 3); // 3 coats at 11 m2/L per coat
    paintBuckets18L = Math.max(1, Math.ceil(paintLitersRequired / 18));
    puttyBagsRequired = Math.max(1, Math.ceil(paintArea / 14));

    const basePaintRecord = findPriceRecord('paint_plastic_standard');
    const laborPaintRecord = findPriceRecord('labor_paint_m2');

    const unitMat = round2(basePaintRecord.referencePriceEgp * regionMult * qualityMult);
    const unitLab = dimensions.includeLabor ? round2(laborPaintRecord.referencePriceEgp * regionMult) : 0;
    const qtyWithWaste = round2(paintArea * 1.05);
    const matTot = round2(qtyWithWaste * unitMat);
    const labTot = round2(paintArea * unitLab);

    lineItems.push({
      id: 'item_wall_paint',
      categoryAr: 'الدهانات',
      itemNameAr: `دهان حوائط (${wallColor.nameAr} - ${wallColor.code}) شامل التأسيس`,
      unitAr: 'م²',
      quantity: paintArea,
      wastePercent: 5,
      quantityWithWaste: qtyWithWaste,
      referenceUnitPriceEgp: unitMat,
      laborUnitPriceEgp: unitLab,
      materialTotalEgp: matTot,
      laborTotalEgp: labTot,
      combinedTotalEgp: matTot + labTot,
      contractorActualQuoteEgp: customContractorQuotes['item_wall_paint'],
      priceSourceAr: basePaintRecord.sourceAr,
      lastUpdated: basePaintRecord.lastUpdated,
      notesAr: `يحتاج تقريباً ${paintLitersRequired} لتر دهان (${paintBuckets18L} بستلة 18 لتر) + ${puttyBagsRequired} شيكارة معجون.`,
    });

    // If user selected decorative wall finish (Molding, Wood Slats, Marble Alt, etc.)
    if (wallFinish.id !== 'finish_paint_matte') {
      const featureWallArea = round2(netPaintableWallAreaM2 * 0.32); // Typical feature wall ratio ~32% of walls
      const finishRec = findPriceRecord(wallFinish.priceCategoryKey);
      const fMat = round2(finishRec.referencePriceEgp * regionMult * qualityMult);
      const fLab = dimensions.includeLabor ? round2(fMat * 0.22) : 0;
      const fQtyWaste = round2(featureWallArea * 1.08);
      const fMatTot = round2(fQtyWaste * fMat);
      const fLabTot = round2(featureWallArea * fLab);

      lineItems.push({
        id: 'item_wall_feature',
        categoryAr: 'تجاليد وديكورات الحوائط',
        itemNameAr: `${wallFinish.nameAr} (حائط مميز وتفاصيل معمارية)`,
        unitAr: 'م²',
        quantity: featureWallArea,
        wastePercent: 8,
        quantityWithWaste: fQtyWaste,
        referenceUnitPriceEgp: fMat,
        laborUnitPriceEgp: fLab,
        materialTotalEgp: fMatTot,
        laborTotalEgp: fLabTot,
        combinedTotalEgp: fMatTot + fLabTot,
        contractorActualQuoteEgp: customContractorQuotes['item_wall_feature'],
        priceSourceAr: finishRec.sourceAr,
        lastUpdated: finishRec.lastUpdated,
        notesAr: finishRec.notesAr,
      });
    }
  }

  // 3. Flooring Calculation
  let floorTilesWithWasteM2 = 0;
  if (includeFloor) {
    const floorObj = FLOORING_OPTIONS.find((f) => f.id === selections.flooringId) || FLOORING_OPTIONS[0];
    const floorRec = findPriceRecord(floorObj.priceCategoryKey);
    const laborFloorRec = findPriceRecord('labor_floor_m2');

    const waste = floorObj.wastePercentage;
    floorTilesWithWasteM2 = round2(floorAreaM2 * (1 + waste / 100));

    const fQualityMult =
      QUALITY_TIERS.find((q) => q.id === (selections.flooringQuality || dimensions.qualityTier))?.multiplier ||
      qualityMult;

    const unitMat = round2(floorRec.referencePriceEgp * regionMult * fQualityMult);
    const unitLab = dimensions.includeLabor ? round2(laborFloorRec.referencePriceEgp * regionMult) : 0;
    const matTot = round2(floorTilesWithWasteM2 * unitMat);
    const labTot = round2(floorAreaM2 * unitLab);

    lineItems.push({
      id: 'item_flooring',
      categoryAr: 'الأرضيات',
      itemNameAr: `${floorObj.nameAr} - لون ${floorObj.colorNameAr}`,
      unitAr: 'م²',
      quantity: floorAreaM2,
      wastePercent: waste,
      quantityWithWaste: floorTilesWithWasteM2,
      referenceUnitPriceEgp: unitMat,
      laborUnitPriceEgp: unitLab,
      materialTotalEgp: matTot,
      laborTotalEgp: labTot,
      combinedTotalEgp: matTot + labTot,
      contractorActualQuoteEgp: customContractorQuotes['item_flooring'],
      priceSourceAr: floorRec.sourceAr,
      lastUpdated: floorRec.lastUpdated,
      notesAr: `شامل ${waste}% نسبة هالك قص ووزرات محيطية (${perimeterM} متر طولي).`,
    });
  }

  // 4. Ceiling & Lighting Calculation
  let gypsumBoardM2 = 0;
  let ledStripMeters = 0;
  let recommendedSpotlightsCount = 0;

  if (includeCeiling) {
    if (
      selections.ceilingOptions.includes('ceil_gypsum_cove') ||
      selections.ceilingOptions.includes('ceil_gypsum_flat')
    ) {
      gypsumBoardM2 = round2(ceilingAreaM2 * 0.65); // Perimeter cove + curtain box + design bands
      const gypRec = findPriceRecord('ceiling_gypsum_board');
      const gMat = round2(gypRec.referencePriceEgp * regionMult);
      const gLab = dimensions.includeLabor ? round2(120 * regionMult) : 0;
      const gMatTot = round2(gypsumBoardM2 * gMat);
      const gLabTot = round2(gypsumBoardM2 * gLab);

      lineItems.push({
        id: 'item_ceiling_gypsum',
        categoryAr: 'الجبس بورد والأسقف',
        itemNameAr: 'سقف معلق جبس بورد كناوف مع بيت نور ومجاري ستائر',
        unitAr: 'م²',
        quantity: gypsumBoardM2,
        wastePercent: 7,
        quantityWithWaste: round2(gypsumBoardM2 * 1.07),
        referenceUnitPriceEgp: gMat,
        laborUnitPriceEgp: gLab,
        materialTotalEgp: gMatTot,
        laborTotalEgp: gLabTot,
        combinedTotalEgp: gMatTot + gLabTot,
        contractorActualQuoteEgp: customContractorQuotes['item_ceiling_gypsum'],
        priceSourceAr: gypRec.sourceAr,
        lastUpdated: gypRec.lastUpdated,
        notesAr: gypRec.notesAr,
      });
    }

    if (selections.ceilingOptions.includes('ceil_cornice')) {
      const cornRec = findPriceRecord('ceiling_cornice_futech');
      const cMat = round2(cornRec.referencePriceEgp * regionMult);
      const cLab = dimensions.includeLabor ? round2(45 * regionMult) : 0;
      const cQtyWaste = round2(perimeterM * 1.06);
      lineItems.push({
        id: 'item_ceiling_cornice',
        categoryAr: 'الجبس بورد والأسقف',
        itemNameAr: 'كرانيش سقف فيوتك بولي يوريثان بالمتر الطولي',
        unitAr: 'م.ط',
        quantity: perimeterM,
        wastePercent: 6,
        quantityWithWaste: cQtyWaste,
        referenceUnitPriceEgp: cMat,
        laborUnitPriceEgp: cLab,
        materialTotalEgp: round2(cQtyWaste * cMat),
        laborTotalEgp: round2(perimeterM * cLab),
        combinedTotalEgp: round2(cQtyWaste * cMat + perimeterM * cLab),
        contractorActualQuoteEgp: customContractorQuotes['item_ceiling_cornice'],
        priceSourceAr: cornRec.sourceAr,
        lastUpdated: cornRec.lastUpdated,
        notesAr: 'يحسب على محيط الغرفة الصافي.',
      });
    }
  }

  if (includeLighting) {
    recommendedSpotlightsCount = Math.max(4, Math.ceil(floorAreaM2 / 2.0));
    const spotRec = findPriceRecord('lighting_spotlights');
    const sMat = round2(spotRec.referencePriceEgp * qualityMult);
    const sLab = dimensions.includeLabor ? round2(75 * regionMult) : 0;

    lineItems.push({
      id: 'item_lighting_spots',
      categoryAr: 'الإضاءة والكهرباء',
      itemNameAr: `سبوتات غاطسة ضد التوهج (${selections.lightingTemp}) شاملة التوصيل`,
      unitAr: 'قطعة',
      quantity: recommendedSpotlightsCount,
      wastePercent: 0,
      quantityWithWaste: recommendedSpotlightsCount,
      referenceUnitPriceEgp: sMat,
      laborUnitPriceEgp: sLab,
      materialTotalEgp: round2(recommendedSpotlightsCount * sMat),
      laborTotalEgp: round2(recommendedSpotlightsCount * sLab),
      combinedTotalEgp: round2(recommendedSpotlightsCount * (sMat + sLab)),
      contractorActualQuoteEgp: customContractorQuotes['item_lighting_spots'],
      priceSourceAr: spotRec.sourceAr,
      lastUpdated: spotRec.lastUpdated,
      notesAr: `تم احتساب سبوت لكل 2 م² لتحقيق شدة إضاءة قياسية متوازنة (${selections.lightingTemp}).`,
    });

    if (selections.ceilingOptions.includes('light_hidden_led') || selections.ceilingOptions.includes('ceil_gypsum_cove')) {
      ledStripMeters = round2(perimeterM * 0.85);
      const ledRec = findPriceRecord('lighting_led_strip');
      const lMat = round2(ledRec.referencePriceEgp * qualityMult);
      const lLab = dimensions.includeLabor ? round2(40 * regionMult) : 0;

      lineItems.push({
        id: 'item_lighting_led',
        categoryAr: 'الإضاءة والكهرباء',
        itemNameAr: `إضاءة مخفية ليد بروفايل وشريط كثافة عالية (${selections.lightingTemp})`,
        unitAr: 'م.ط',
        quantity: ledStripMeters,
        wastePercent: 5,
        quantityWithWaste: round2(ledStripMeters * 1.05),
        referenceUnitPriceEgp: lMat,
        laborUnitPriceEgp: lLab,
        materialTotalEgp: round2(ledStripMeters * lMat),
        laborTotalEgp: round2(ledStripMeters * lLab),
        combinedTotalEgp: round2(ledStripMeters * (lMat + lLab)),
        contractorActualQuoteEgp: customContractorQuotes['item_lighting_led'],
        priceSourceAr: ledRec.sourceAr,
        lastUpdated: ledRec.lastUpdated,
        notesAr: ledRec.notesAr,
      });
    }

    if (selections.ceilingOptions.includes('light_chandelier')) {
      const chRec = findPriceRecord('lighting_chandelier');
      const chMat = round2(chRec.referencePriceEgp * qualityMult);
      const chLab = dimensions.includeLabor ? 350 : 0;
      lineItems.push({
        id: 'item_lighting_chandelier',
        categoryAr: 'الإضاءة والكهرباء',
        itemNameAr: 'وحدة إضاءة مركزية (نجفة متناسقة مع نمط التصميم)',
        unitAr: 'وحدة',
        quantity: 1,
        wastePercent: 0,
        quantityWithWaste: 1,
        referenceUnitPriceEgp: chMat,
        laborUnitPriceEgp: chLab,
        materialTotalEgp: chMat,
        laborTotalEgp: chLab,
        combinedTotalEgp: chMat + chLab,
        contractorActualQuoteEgp: customContractorQuotes['item_lighting_chandelier'],
        priceSourceAr: chRec.sourceAr,
        lastUpdated: chRec.lastUpdated,
        notesAr: chRec.notesAr,
      });
    }
  }

  // 5. Furniture & Curtains Calculation
  let furnitureTotalEgp = 0;
  if (includeFurniture && selections.selectedFurnitureIds.length > 0) {
    selections.selectedFurnitureIds.forEach((fId) => {
      const furnObj = FURNITURE_CATALOG.find((f) => f.id === fId);
      if (furnObj) {
        const tierKey = selections.furnitureLuxury || dimensions.qualityTier;
        const fPrice = round2((furnObj.estimatedPriceEgp[tierKey] || furnObj.estimatedPriceEgp.standard) * regionMult);
        furnitureTotalEgp += fPrice;
        lineItems.push({
          id: `item_${furnObj.id}`,
          categoryAr: 'الأثاث والفرش والستائر',
          itemNameAr: `${furnObj.nameAr} (${furnObj.materialAr})`,
          unitAr: 'مجموعة',
          quantity: 1,
          wastePercent: 0,
          quantityWithWaste: 1,
          referenceUnitPriceEgp: fPrice,
          laborUnitPriceEgp: 0,
          materialTotalEgp: fPrice,
          laborTotalEgp: 0,
          combinedTotalEgp: fPrice,
          contractorActualQuoteEgp: customContractorQuotes[`item_${furnObj.id}`],
          priceSourceAr: 'متوسط أسعار معارض الأثاث بدمياط والقاهرة 2026',
          lastUpdated: '2026-10-01',
          notesAr: `مستوى الفخامة: ${QUALITY_TIERS.find((q) => q.id === tierKey)?.nameAr || 'قياسي'}`,
        });
      }
    });
  }

  const materialsTotalEgp = round2(
    lineItems
      .filter((i) => i.categoryAr !== 'الأثاث والفرش والستائر')
      .reduce((acc, item) => acc + item.materialTotalEgp, 0)
  );

  const laborTotalEgp = round2(lineItems.reduce((acc, item) => acc + item.laborTotalEgp, 0));

  const subtotal = materialsTotalEgp + furnitureTotalEgp + laborTotalEgp;
  const contingencyEgp = dimensions.includeSupervisionAndContingency
    ? round2(subtotal * ((dimensions.contingencyPercent || 10) / 100))
    : 0;

  const estimatedGrandTotalEgp = round2(subtotal + contingencyEgp);

  const hasContractorQuotes = Object.keys(customContractorQuotes).length > 0;
  const contractorQuotesTotalEgp = hasContractorQuotes
    ? round2(
        lineItems.reduce(
          (acc, item) =>
            acc + (item.contractorActualQuoteEgp !== undefined ? item.contractorActualQuoteEgp : item.combinedTotalEgp),
          0
        ) + contingencyEgp
      )
    : undefined;

  return {
    isExactMeasurement: dimensions.isMeasuredByUser,
    accuracyNoticeAr: dimensions.isMeasuredByUser
      ? 'تم حساب الكميات هندسياً بناءً على المقاسات الفعلية التي أدخلتها للمكان.'
      : 'تقدير تقريبي محدود الدقة (مبني على أبعاد افتراضية للغرفة). للحصول على حصر كميات هندسي دقيق، يرجى إدخال الطول والعرض والارتفاع الفعلي بالمتر.',
    geometry: {
      floorAreaM2,
      perimeterM,
      grossWallAreaM2,
      openingsAreaM2,
      netPaintableWallAreaM2,
      ceilingAreaM2,
    },
    quantitiesSummary: {
      floorTilesWithWasteM2,
      paintLitersRequired,
      paintBuckets18L,
      puttyBagsRequired,
      gypsumBoardM2,
      ledStripMeters,
      recommendedSpotlightsCount,
    },
    lineItems,
    totals: {
      materialsTotalEgp,
      furnitureTotalEgp,
      laborTotalEgp,
      contingencyEgp,
      estimatedGrandTotalEgp,
      contractorQuotesTotalEgp,
    },
    assumptionsAr: [
      `تم خصم مساحة الفتحات (${dimensions.doorsCount} باب و${dimensions.windowsCount} شباك بمساحة ${openingsAreaM2} م²) من إجمالي مسطح الحوائط.`,
      `المنطقة الجغرافية المختارة: ${regionObj.nameAr} | مستوى الجودة: ${qualityObj.nameAr}.`,
      'الحسابات مرتبطة حصرياً بالتصميم المختار حالياً والعناصر المفعّلة فيه دون إضافة بنود غير مطلوبة.',
      'الأسعار المرجعية استرشادية لتقدير الميزانية وتفصل بين سعر الخامة وتكلفة المصنعيات وعروض المقاولين الفعلية.',
    ],
  };
}

export function calculateFullApartmentSummary(
  project: MakanProject,
  priceCatalog: PriceRecord[]
): {
  roomReports: { roomId: string; roomNameAr: string; report: BOQReport }[];
  totalFloorAreaM2: number;
  roomsMaterialsTotalEgp: number;
  roomsFurnitureTotalEgp: number;
  roomsLaborTotalEgp: number;
  sharedItemsTotalEgp: number;
  apartmentGrandTotalEgp: number;
} {
  const roomReports = project.rooms.map((room) => ({
    roomId: room.id,
    roomNameAr: room.nameAr,
    report: calculateRoomBOQ(room.selections, room.dimensions, priceCatalog),
  }));

  const totalFloorAreaM2 = round2(roomReports.reduce((acc, r) => acc + r.report.geometry.floorAreaM2, 0));
  const roomsMaterialsTotalEgp = round2(roomReports.reduce((acc, r) => acc + r.report.totals.materialsTotalEgp, 0));
  const roomsFurnitureTotalEgp = round2(roomReports.reduce((acc, r) => acc + r.report.totals.furnitureTotalEgp, 0));
  const roomsLaborTotalEgp = round2(roomReports.reduce((acc, r) => acc + r.report.totals.laborTotalEgp, 0));
  const roomsContingencyEgp = round2(roomReports.reduce((acc, r) => acc + r.report.totals.contingencyEgp, 0));

  // Shared apartment items calculated ONCE per apartment (never duplicated across rooms!)
  const shared = project.sharedApartmentCosts || {
    mainElectricalPanelEgp: 14500,
    mainArmoredDoorEgp: 18500,
    sharedPlumbingNetworkEgp: 16000,
  };
  const sharedItemsTotalEgp =
    project.rooms.length > 1
      ? round2(shared.mainElectricalPanelEgp + shared.mainArmoredDoorEgp + shared.sharedPlumbingNetworkEgp)
      : 0;

  const apartmentGrandTotalEgp = round2(
    roomsMaterialsTotalEgp + roomsFurnitureTotalEgp + roomsLaborTotalEgp + roomsContingencyEgp + sharedItemsTotalEgp
  );

  return {
    roomReports,
    totalFloorAreaM2,
    roomsMaterialsTotalEgp,
    roomsFurnitureTotalEgp,
    roomsLaborTotalEgp,
    sharedItemsTotalEgp,
    apartmentGrandTotalEgp,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
