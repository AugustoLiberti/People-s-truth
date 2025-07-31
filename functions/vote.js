// functions/vote.js
import geoip from "geoip-lite";
import { Client } from "pg";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const data = JSON.parse(event.body);

  // GeoIP
  const ip = event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"];
  const geo = geoip.lookup(ip) || {};

  // Connect to Neon (Postgres)
  const client = new Client({
    host:     process.env.NEON_DB_HOST,
    database: process.env.NEON_DB_NAME,
    user:     process.env.NEON_DB_USER,
    password: process.env.NEON_DB_PASSWORD,
    port:     parseInt(process.env.NEON_DB_PORT, 10),
    ssl:      { rejectUnauthorized: false },  // Neon requires SSL
  });
  await client.connect();

  // Insert the vote record
  await client.query(
    `INSERT INTO votes (
      question_id, choice, vote_timestamp, time_taken_sec,
      timezone, user_agent, screen_resolution, device_type,
      latitude, longitude, geo_country, geo_region, geo_city
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      data.questionId,
      data.choice,
      data.timestamp,
      data.timeTakenSec,
      data.timezone,
      data.userAgent,
      data.screenResolution,
      data.deviceType,
      data.lat,
      data.lon,
      geo.country  || null,
      geo.region   || null,
      geo.city     || null,
    ]
  );

  await client.end();
  return { statusCode: 204 };
};
