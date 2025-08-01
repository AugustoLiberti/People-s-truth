import geoip from "geoip-lite";
import { Client } from "pg";

export const handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse incoming vote data
  const data = JSON.parse(event.body);

  // GeoIP lookup
  const ip =
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["x-forwarded-for"];
  const geo = geoip.lookup(ip) || {};

  // Connect to Neon Postgres using Netlify's DATABASE_URL
  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  // Insert vote into the votes table
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
      geo.country || null,
      geo.region  || null,
      geo.city    || null
    ]
  );

  // Close the database connection
  await client.end();
  return { statusCode: 204 };
};
