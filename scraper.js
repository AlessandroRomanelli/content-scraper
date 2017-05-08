"use strict"

//Initializing the modules

  // CORE
  const fs = require('fs');
  const EventEmitter = require('events');
  const util = require('util');

  // NPM Packages

    //Data scraping
    const express = require('express');
    const request = require('request');
    const cheerio = require('cheerio');
    const app = express();

    //Conversion
    const json2csv = require('json2csv');

  //EventEmitter
  class MyEmitter extends EventEmitter {}
  const myEmitter = new MyEmitter();

//Global Vars
let date = new Date();
let log_file = fs.createWriteStream(__dirname + '/scraper-error.log', {flags : 'w'});
let log_stdout = process.stdout;

//Handling errors by writing them into the error.log
//When a console.error is called, this function is fired:
console.error = function(d) {
  //Updates the time variable
  date = new Date();
  //Prepends the timestamp to the error
  log_file.write(util.format(`[${date.toDateString()} ${date.toTimeString()}] `));
  //Write the error into the error.log
  log_file.write(util.format(d) + '\n');
  //Write the err
  log_stdout.write(util.format(`\n${d} \n(You can check out a list of errors by opening the scraper-error.log)`) + '\n');
}

function dataScrape(date, targetUrl) {
  request(targetUrl, (error, response, html) => {
    if (error) {
      if (error.syscall == "getaddrinfo") {
        return console.error(`An error has occured. Error ${error.code}: could not connect to ${error.hostname}:${error.port}.`);
      } else { throw error; }
    }
    let $ = cheerio.load(html);
    let urlList = [];
    let json = {};
    let container = [];

    $(".products li a").each(function(i, elem) {
      let shirtUrl = $(this).attr("href");
      urlList.push(shirtUrl);
    });

    for (let i=0; i < urlList.length; i++) {
      let url = `http://www.shirts4mike.com/${urlList[i]}`;
      //Opening the rquest to the target URL
      getShirtData(url, container, json, urlList);
    }
    myEmitter.on('completeData', () => {
      json = {
        "date" : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        "shirtData" : container
      };
      if (fs.existsSync('output.json')) {
        fs.unlinkSync('output.json');
      }
      fs.writeFile('output.json', JSON.stringify(json, null, 4), (error) => {
        if (error) { return console.error(error)};
        console.log("The file output.json was successfully written.");
      });
      myEmitter.emit('printedData');
    });
  });
}

function getShirtData (url, container, json, urlList) {
  request(url, (error, response, html) => {
    if (error) { return console.error(error)};
    let $ = cheerio.load(html);
    let price, title, shirtUrl, imageUrl;
    let subJSON = {price : "", title : "", shirtUrl : "", imageUrl : ""};

    price = $(".price").text();
    subJSON.price = price;

    title = $(".shirt-picture img").attr("alt");
    subJSON.title = title;

    imageUrl = $(".shirt-picture img").attr("src");
    subJSON.imageUrl = imageUrl;

    shirtUrl = url;
    subJSON.shirtUrl = shirtUrl;

    container.push(subJSON);

    if (container.length === urlList.length) {
      myEmitter.emit('completeData');
    }
  });
}

function  csvConversion() {
  myEmitter.on('printedData', () => {
    fs.readFile('output.json', (error, data) => {
      if (error) { return console.error(error)};
      let shirts = JSON.parse(data.toString());
      let fields = ['title', 'price', 'imageUrl', 'shirtUrl'];
      let csv = json2csv({ data: shirts.shirtData, fields: fields});
      fs.writeFile(`data/${shirts.date}.csv`, csv, (error) => {
        if (error) throw error;
        console.log("JSON converted to CSV");
      });
    });
  });
}

//GET this started
app.get('/', (req, res) => {
  //Assigning the given entry point
  const entryPoint = "http://www.shirts4mike.com/shirts.php";
  dataScrape(date, entryPoint);
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }
  csvConversion();
  res.send('Check your console!');
});

app.listen('8081');

console.log('Server is up @LocalHost and listening to port 8081');

exports = module.exports = app
