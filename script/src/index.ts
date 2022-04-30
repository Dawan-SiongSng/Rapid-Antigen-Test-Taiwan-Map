import fetchAntigen from "./fetch_antigen";
import fetchPharmacy from "./fetch_pharmacy";
import * as fs from "node:fs";
import { JsonArrayType } from "./util";
import fetchPharmacyUptime from "./fetch_pharmacy_uptime";
import openStreetMap from "./open_street_map";
import * as childProcess from "node:child_process";

async function start() {
    let times = 0;

    // runs every minute
    setInterval((async () => {
        if (times >= 15) {
            clearInterval();
            return;
        }

        times++;
        await startFetch();
        git();
    }), 1000 * 60 * 60);
}

async function startFetch() {
    console.log("Fetching pharmacies...");
    writeJson("pharmacy", await fetchPharmacy());
    console.log("Fetching pharmacies uptime...");
    const pharmacyUptime = await fetchPharmacyUptime();
    writeJson("pharmacy_uptime", pharmacyUptime);

    console.log("Fetching antigen...");
    const oldAntigen = readJson("antigen");
    const antigen = await fetchAntigen(oldAntigen, pharmacyUptime);
    writeJson("antigen", antigen);
    console.log("Converting to OpenStreetMap format...");
    writeJson("antigen_open_street_map", openStreetMap(antigen));

    console.log("Finished");
}

function git() {
    console.log("Git commit...");
    childProcess.execSync("CLONE_DIR=$(mktemp -d)");

    childProcess.execSync("git config --global user.email github-actions[bot]@github.com");
    childProcess.execSync("git config --global user.name GitHub Actions Bot");

    console.log("Cloning repository...");
    childProcess.execSync("git clone --single-branch --branch data \"https://x-access-token:$API_TOKEN_GITHUB@github.com/SiongSng/Rapid-Antigen-Test-Taiwan-Map.git\" \"$CLONE_DIR\"");

    childProcess.execSync("cp -R data $CLONE_DIR");

    childProcess.execSync("git add .");
    childProcess.execSync("git commit --message \"Auto update data\"");
    childProcess.execSync("git push -u origin HEAD:data");
    console.log("Git committed");
}

function writeJson(filename: string, data: unknown) {
    if (!fs.existsSync("data")) {
        fs.mkdirSync("data");
    }

    fs.writeFileSync(`data/${filename}.json`, JSON.stringify(data, null, 2));
}

function readJson(filename: string): JsonArrayType | null {
    const file = `data/${filename}.json`;
    if (!fs.existsSync(file)) {
        return null;
    } else {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }
}

start();