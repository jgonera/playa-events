import * as cheerio from "cheerio";
import pMap from "p-map";

const CONCURRENCY = 10;
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
  name: string;
  dates: string;
  type: string;
  camp: string;
  campUrl: string | undefined;
  location: string;
  email: string;
  description: string;
  url: string;
}

async function getEventDetails(url: string): Promise<EventDetails> {
  const response = await fetch(url);
  const body = await response.text();
  const $ = cheerio.load(body);

  const whitepage = $(".whitepage");

  const datesEl = whitepage.find('.row div:contains("Dates and Times:") + div');

  const details = {
    name: whitepage.find("h2").text().trim(),
    dates: (datesEl.length > 0
      ? datesEl
      : whitepage.find('.row div:contains("Date and Time:") + div')
    )
      .text()
      .trim(),
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

  console.log(details);

  return details;
}

const eventUrls = new Set(
  (await pMap(URLS, getEventUrls, { concurrency: CONCURRENCY })).flat(),
);

const eventDetails = await pMap(eventUrls, getEventDetails, {
  concurrency: CONCURRENCY,
});

console.log(eventDetails);
