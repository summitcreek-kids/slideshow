import React, { Component } from "react";
import BackgroundSlideshow from "react-background-slideshow"
import { Dropbox } from "dropbox";
import Async from "react-async";
import queryString from "query-string";
import dateFormat from "dateformat";
import _ from "underscore";

const params = queryString.parse(window.location.search);
const token = params.token;
const animationDelay = (parseInt(params.delay, 10) || 7) * 1000;

const folders = [];
if (params.folder) {
  folders.push(params.folder);
}
folders.push(dateFormat(new Date(), "yyyy-mm-dd"));
folders.push("default");

const errorMsg = "Failed to load.  Did you specify your dropbox token via the token param?";

console.log("------------------------------------------------------------------------------");
console.log("Welcome to the Summitcreek Kids slideshow page.");
console.log("Params:");
console.log("  token   Dropbox token");
console.log("  delay   Delay between slides in seconds (defaults to 10)");
console.log("  folder  Name of folder to use (defaults to 'YYYY-MM-DD' and then 'default')");
console.log("------------------------------------------------------------------------------");

const dbx = new Dropbox({
  accessToken: token,
  fetch: fetch
});

const selectFolder = (folders, resolve, reject) => {
  return dbx.filesListFolder({ path: "" })
    .then((response) => {
      const foldersInResponse = response
        .entries
        .filter((entry) => entry[".tag"] === "folder")
        .map((entry) => entry.path_lower.split("/")[1]);
      console.log(`Found folders ${foldersInResponse.join(", ")}`);

      let folder = folders.filter((f) => foldersInResponse.indexOf(f) !== -1)[0];
      console.log(`Selecting folder ${folder}`);

      resolve(`/${folder}`);
    })
    .catch((error) => reject(error));
};

const getFiles = (files, resolve, reject) => {
  return Promise.all(_.sortBy(files.entries, "path_display").map((entry) => {
    const cached = localStorage.getItem(entry.content_hash);
    if (cached) {
      console.log("Using cached image");
      return Promise.resolve(cached);
    }

    console.log(`Downloading ${entry.path_display}`);
    return dbx.filesDownload({ path: entry.path_display })
      .then((result) => {
        console.log("Adding to cache");
        let value = window.URL.createObjectURL(result.fileBlob);
        localStorage.setItem(entry.content_hash, value);
        return value;
      })
      .catch((error) => reject(error));
  })).then((result) => resolve(result))
    .catch((error) => reject(error));
};

const load = () => new Promise((resolve, reject) => {
  selectFolder(folders, (folder) => {
    return dbx.filesListFolder({ path: folder })
      .then((response) => getFiles(response, resolve, reject))
      .catch((error) => reject(error));
  }, reject);
});

class App extends Component {
  render() {
    return (
      <div className="App">
        <Async promiseFn={load}>
          <Async.Loading>Loading...</Async.Loading>
          <Async.Resolved>
            {(data) => (
              <BackgroundSlideshow images={data} animationDelay={animationDelay} />
            )}
          </Async.Resolved>
          <Async.Rejected>{errorMsg}</Async.Rejected>
        </Async>

      </div>
    );
  }
}

export default App;
