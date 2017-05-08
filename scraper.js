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
  //Write the error in the console
  log_stdout.write(util.format(`\n${d} \n(You can check out a list of errors by opening the scraper-error.log)`) + '\n');
}

//Function that scrapes the shirt data
function dataScrape(date, targetUrl) {
  //The entry point is passed to the request
  request(targetUrl, (error, response, html) => {
    //Error handler
    if (error) {
      if (error.syscall == "getaddrinfo") {
        return console.error(`An error has occured. Error ${error.code}: could not connect to ${error.hostname}:${error.port}. \nPlease check your connection or contact the website administrator.`);
      } else { throw error; }
    }
    //Turning the HTML of the target into jQuery
    let $ = cheerio.load(html);
    //Empty vars
    let urlList = [];
    let json = {};
    let container = [];
    //Create a collection of the shirtUrls
    $(".products li a").each(function(i, elem) {
      let shirtUrl = $(this).attr("href");
      urlList.push(shirtUrl);
    });
    //For every shirtUrl found
    for (let i=0; i < urlList.length; i++) {
      //Target the shirtUrl for scraping
      let url = `http://www.shirts4mike.com/${urlList[i]}`;
      //Scrape the given url for data
      getShirtData(url, container, json, urlList);
    }
    //When the container array has been populated by shirt objects
    myEmitter.on('completeData', () => {
      //Create the final JSON structure
      json = {
        "date" : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        //Pass the shirt data into the JSON
        "shirtData" : container
      };
      //If there is an older output.json
      if (fs.existsSync('output.json')) {
        //Delete it
        fs.unlinkSync('output.json');
      }
      //Write the resulting JSON into a file that can be used by other apps
      fs.writeFile('output.json', JSON.stringify(json, null, 4), (error) => {
        //Error handler
        if (error) { return console.error(error)};
        //Success message
        console.log("The file output.json was successfully written.");
      });
      //Create the event for the json being successfully printed
      myEmitter.emit('printedData');
    });
  });
}

//Function that scrapes the shirtData from their respective urls
function getShirtData (url, container, json, urlList) {
  //A request is sent to the shirtUrl
  request(url, (error, response, html) => {
    //Error handler
    if (error) { return console.error(error)};
    //Turn the received html into jQuery
    let $ = cheerio.load(html);
    //Setting up vars
    let price, title, shirtUrl, imageUrl;
    //Preparing the shirt object
    let shirt = {price : "", title : "", shirtUrl : "", imageUrl : ""};
    //Targetting and scraping the data
    price = $(".price").text();
    shirt.price = price;

    title = $(".shirt-picture img").attr("alt");
    shirt.title = title;

    imageUrl = $(".shirt-picture img").attr("src");
    shirt.imageUrl = imageUrl;

    shirtUrl = url;
    shirt.shirtUrl = shirtUrl;
    //Populating the empty array with shirt objects
    container.push(shirt);
    //When the container has the same number of elements as the urlList array
    if (container.length === urlList.length) {
      //The data is complete and ready to be passed onwards
      myEmitter.emit('completeData');
    }
  });
}

//Function that turns JSON into CSV
function  csvConversion() {
  //When the json has been printed out to output.json
  myEmitter.on('printedData', () => {
    //Read the output.json file
    fs.readFile('output.json', (error, data) => {
      //Error handler
      if (error) { return console.error(error)};
      //Pass the shirtsData to a variable
      let shirts = JSON.parse(data.toString());
      //Set up the field and their display order according to the requests
      let fields = ['title', 'price', 'imageUrl', 'shirtUrl'];
      //Turn json into csv with the proper module
      let csv = json2csv({ data: shirts.shirtData, fields: fields});
      //Create a .csv file with today's date as name
      fs.writeFile(`data/${shirts.date}.csv`, csv, (error) => {
        //Error handler
        if (error) { return console.error(error)};
        //CSV conversion success message
        console.log("The CSV file was successfully written, you can find it in the /data folder.");
      });
    });
  });
}

//Get the server started
app.get('/', (req, res) => {
  //Assigning the given entry point
  const entryPoint = "http://www.shirts4mike.com/shirts.php";
  //Passing today's date and entry point to the scrape function
  dataScrape(date, entryPoint);
  //If the data folder doesn't exists
  if (!fs.existsSync('data')) {
    //Create one
    fs.mkdirSync('data');
  }
  //Run the conversion
  csvConversion();
  //Friendly advice for the user
  res.send('Check your console!');
});

app.listen('8081');

console.log('Server is up at 127.0.0.1 and listening to port 8081');

exports = module.exports = app
