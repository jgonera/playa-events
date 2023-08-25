import { writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import { addDays, parse } from "date-fns";
import pMap from "p-map";
import { basename } from "node:path";

const JSON_FILE = "src/data.json";
const CONCURRENCY = 10;
const DATETIME_FORMATS = ["MMMM do, yyyy, h a", "MMMM do, yyyy, h:mm a"];
const TIME_FORMATS = ["h a", "h:mm a"];
const NOW = new Date();
const URLS = [
  "https://playaevents.burningman.org/2023/playa_events/01/",
  "https://playaevents.burningman.org/2023/playa_events/02/",
  "https://playaevents.burningman.org/2023/playa_events/03/",
  "https://playaevents.burningman.org/2023/playa_events/04/",
  "https://playaevents.burningman.org/2023/playa_events/05/",
  "https://playaevents.burningman.org/2023/playa_events/06/",
  "https://playaevents.burningman.org/2023/playa_events/07/",
  "https://playaevents.burningman.org/2023/playa_events/08/",
  "https://playaevents.burningman.org/2023/playa_events/09/",
];

function parseDate(dateString: string): { start: Date; end: Date } {
  const [startString, endString] = dateString
    .replace(/[\t\n]/g, "")
    .split("–")
    .map((s) => s.trim().replace(/^[A-z]*, /, ""));

  if (startString === undefined || endString === undefined) {
    throw new Error(`Can't separate start and end dates: ${dateString}`);
  }

  const startFormat = DATETIME_FORMATS.find(
    (f) => !isNaN(+parse(startString, f, NOW)),
  );
  const endFormat = TIME_FORMATS.find((f) => !isNaN(+parse(endString, f, NOW)));

  if (startFormat === undefined || endFormat === undefined) {
    throw new Error(`Wrong date format: ${dateString}`);
  }

  const start = parse(startString, startFormat, NOW);
  const end = parse(endString, endFormat, start);

  return { start, end: end > start ? end : addDays(end, 1) };
}

async function getEventUrls(url: string): Promise<string[]> {
  const response = await fetch(url);
  const body = await response.text();
  const $ = cheerio.load(body);

  return $(".listing li a")
    .map((_i, el) => {
      return `https://playaevents.burningman.org${$(el).attr("href")}`;
    })
    .get();
}

interface EventDetails {
  id: string;
  name: string;
  dates: { start: Date; end: Date }[];
  type: string;
  camp: string;
  campUrl: string | undefined;
  location: string;
  email: string;
  description: string;
  url: string;
}

async function getEventDetails(url: string): Promise<EventDetails> {
  console.log(`Getting details for ${url}...`);

  const response = await fetch(url);
  const body = await response.text();
  const $ = cheerio.load(body);
  const whitepage = $(".whitepage");
  const datesEl = whitepage.find('.row div:contains("Dates and Times:") + div');

  const details = {
    id: basename(url),
    name: whitepage.find("h2").text().trim(),
    dates: (datesEl.length > 0
      ? (datesEl.html() ?? "").split("<br>").slice(0, -1)
      : [whitepage.find('.row div:contains("Date and Time:") + div').text()]
    ).map(parseDate),
    type: whitepage.find('.row div:contains("Type:") + div').text().trim(),
    camp: whitepage
      .find('.row div:contains("Located at Camp:") + div')
      .text()
      .trim(),
    campUrl: whitepage
      .find('.row div:contains("Located at Camp:") + div a')
      .attr("href"),
    location: whitepage
      .find('.row div:contains("Location:") + div')
      .text()
      .trim(),
    email: whitepage
      .find('.row div:contains("Contact Email:") + div')
      .text()
      .trim(),
    description: whitepage
      .find('.row div:contains("Description:") + div')
      .text()
      .trim(),
    url,
  };

  return details;
}

async function run() {
  const eventUrls = new Set(
    (await pMap(URLS, getEventUrls, { concurrency: CONCURRENCY })).flat(),
  );

  console.log(`Found ${eventUrls.size} event URLs`);

  const data = await pMap(eventUrls, getEventDetails, {
    concurrency: CONCURRENCY,
  });

  await writeFile(JSON_FILE, JSON.stringify(data, null, 2));
  console.log(`Events saved in ${JSON_FILE}`);
}

async function test() {
  console.log(
    await getEventDetails(
      "https://playaevents.burningman.org/2023/playa_event/44524/",
    ),
  );
  console.log(
    await getEventDetails(
      "https://playaevents.burningman.org/2023/playa_event/41629/",
    ),
  );
  console.log(
    await getEventDetails(
      "https://playaevents.burningman.org/2023/playa_event/45511/",
    ),
  );
  console.log(
    await getEventDetails(
      "https://playaevents.burningman.org/2023/playa_event/41573/",
    ),
  );
}

await run();
// await test();
