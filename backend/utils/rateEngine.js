const db = require('../config/db');

// Detects zone based on area pincode or name match
const detectZone = async (address) => {
  // Try to match pincode from address (6-digit number)
  const pincodeMatch = address.match(/\b\d{6}\b/);
  if (pincodeMatch) {
    const pincode = pincodeMatch[0];
    const [rows] = await db.query(
      'SELECT zone_id FROM areas WHERE pincode = ? LIMIT 1',
      [pincode]
    );
    if (rows.length > 0) return rows[0].zone_id;
  }

  // Fallback: match area name
  const [areas] = await db.query('SELECT id, name, zone_id FROM areas');
  for (const area of areas) {
    if (address.toLowerCase().includes(area.name.toLowerCase())) {
      return area.zone_id;
    }
  }

  return null;
};

// Volumetric weight 
const calcVolumetricWeight = (length, breadth, height) => {
  return parseFloat(((length * breadth * height) / 5000).toFixed(2));
};

// Full charge calculation
const calculateCharge = async ({ pickupZoneId, dropZoneId, length, breadth, height, actualWeight, orderType, paymentType }) => {
  const volumetricWeight = calcVolumetricWeight(length, breadth, height);
  const billedWeight = Math.max(actualWeight, volumetricWeight);

  // Determine if intra or inter zone
  const isIntraZone = pickupZoneId === dropZoneId;

  // Fetch rate card
  const [rateRows] = await db.query(
    `SELECT * FROM rate_cards 
     WHERE from_zone_id = ? AND to_zone_id = ? AND order_type = ?
     LIMIT 1`,
    [pickupZoneId, dropZoneId, orderType]
  );

  if (rateRows.length === 0) {
    throw new Error(`No rate card found for zones ${pickupZoneId} → ${dropZoneId} (${orderType})`);
  }

  const rateCard = rateRows[0];
  let deliveryCharge = billedWeight * rateCard.rate_per_kg;

  // Apply minimum charge if applicable
  if (deliveryCharge < rateCard.min_charge) {
    deliveryCharge = rateCard.min_charge;
  }

  // COD surcharge
  let codSurcharge = 0;
  if (paymentType === 'COD') {
    codSurcharge = rateCard.cod_surcharge;
  }

  const totalCharge = parseFloat((Number(deliveryCharge) + Number(codSurcharge)).toFixed(2));

  return {
    volumetricWeight: parseFloat(Number(volumetricWeight).toFixed(2)),
    billedWeight: parseFloat(Number(billedWeight).toFixed(2)),
    deliveryCharge: parseFloat(Number(deliveryCharge).toFixed(2)),
    codSurcharge: parseFloat(Number(codSurcharge).toFixed(2)),
    totalCharge,
    ratePerKg: rateCard.rate_per_kg,
    isIntraZone
};
};

module.exports = { detectZone, calcVolumetricWeight, calculateCharge };
