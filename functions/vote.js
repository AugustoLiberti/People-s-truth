// functions/vote.js
import geoip from "geoip-lite";
import snowflake from "snowflake-sdk";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const data = JSON.parse(event.body);

  // GeoIP from client IP
  const ip = event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"];
  const geo = geoip.lookup(ip) || {};

  // Connect to Snowflake
  const conn = snowflake.createConnection({
    account:   process.env.SF_ACCOUNT,
    username:  process.env.SF_USER,
    password:  process.env.SF_PASSWORD,
    warehouse: process.env.SF_WAREHOUSE,
    database:  process.env.SF_DATABASE,
    schema:    process.env.SF_SCHEMA,
  });
  await new Promise((res, rej) => conn.connect(err => err ? rej(err) : res()));

  // Insert vote record
  const sql = \`
    INSERT INTO VOTES (
      QUESTION_ID, CHOICE, VOTE_TIMESTAMP, TIME_TAKEN_SEC,
      TIMEZONE, USER_AGENT, SCREEN_RESOLUTION, DEVICE_TYPE,
      LATITUDE, LONGITUDE, GEO_COUNTRY, GEO_REGION, GEO_CITY
    ) VALUES (?, ?, TO_TIMESTAMP_LTZ(?, 3), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  \`;
  const binds = [
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
  ];
  await new Promise((res, rej) =>
    conn.execute({ sqlText: sql, binds, complete: err => err ? rej(err) : res() })
  );

  return { statusCode: 204 };
};
