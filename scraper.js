"use strict"

//Initializing the modules
const express = require('express');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const app = express();


app.get('/scrape', (req, res) => {
  const homeUrl = "http://www.shirts4mike.com/shirts.php";
  request(homeUrl, (error, response, html) => {
    if (error) {
      console.error(error.message);
    } else {
      let $ = cheerio.load(html);
      let urlList = [];

      $(".products li a").each(() => {
        let shirtUrl = $(this);
        console.log(shirtUrl)
        urlList.push(shirtUrl);
      });
    }
  })
  /*
  const url = "http://www.shirts4mike.com/shirt.php?id=101";
  //Opening the rquest to the target URL
  request(url, (error, response, html) => {

    if (error) {
      console.error(error.message)
    } else {
      let $ = cheerio.load(html);
      let price, title, shirtUrl, imageUrl;
      let json = {price : "", title : "", shirtUrl : "", imageUrl : ""};

      price = $(".price").text();
      json.price = price;

      title = $(".shirt-picture img").attr("alt");
      json.title = title;

      imageUrl = $(".shirt-picture img").attr("src");
      json.imageUrl = imageUrl;

      shirtUrl = $(".breadcrumb a").attr("href");
      json.shirtUrl = shirtUrl;

      console.log(json);
      fs.writeFile('output.json', JSON.stringify(json, null, 4), (error) => {
        if (error) {
          console.error(error.message);
        } else {
          console.log("File successfully written! - Check your project directory for the output.json file")
        }
      });
    }
  });*/
  res.send('Check your console!');
});

app.listen('8081');

console.log('Server is up listening to port 8081');

exports = module.exports = app
