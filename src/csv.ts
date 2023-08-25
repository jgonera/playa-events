import { writeFile } from "node:fs/promises";
import { stringify } from "csv/sync";
import { format, parseJSON } from "date-fns";
import data from "./data.json" assert { type: "json" };

const CSV_FILE = "src/data.csv";
const COLUMNS = [
  "Start",
  "End",
  "Multiday",
  "ID",
  "Name",
  "Type",
  "Description",
  "Location",
  "Camp",
  "Camp website",
  "Email",
  "Event website",
];

async function run() {
  const rows = data.reduce<string[][]>((acc, item) => {
    return [
      ...acc,
      ...item.dates.map(({ start, end }) => [
        format(parseJSON(start), "Pp"),
        format(parseJSON(end), "Pp"),
        item.dates.length > 1 ? "Y" : "N",
        item.id,
        item.name,
        item.type,
        item.description,
        item.location,
        item.camp,
        item.campUrl ?? "",
        item.email,
        item.url,
      ]),
    ];
  }, []);

  const csvData = stringify(rows, { header: true, columns: COLUMNS });
  await writeFile(CSV_FILE, csvData);

  console.log(`Events saved in ${CSV_FILE}`);
}

await run();
