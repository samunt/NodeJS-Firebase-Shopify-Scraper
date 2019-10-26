const cheerio = require("cheerio");
const axios = require("axios");
const admin = require("firebase-admin");
const date = new Date();
// pageNum is used for traverse the product listings pages and needs to be at this level
let pageNum = 1;
// $ is used for promises returned from url fetch
let $;

const fetchDataForBCfullProductListing = async () => {
  let url = "https://www.bccannabisstores.com/collections/cannabis-products?page=" + pageNum + "&grid_list=grid-view"
  const result = await axios.get(url);
  return cheerio.load(result.data);
}

// called by getResults()
const fetchDataForOCSfullProductListings = async () => {
  let url = "https://ocs.ca/collections/all-cannabis-products?&page=" + pageNum
  const result = await axios.get(url);
  return cheerio.load(result.data);
};

// called by getResults()
const fetchDataForOCSbestSellers = async () => {
  let url = "https://ocs.ca";
  const result = await axios.get(url);
  return cheerio.load(result.data);
};

// sleep function so we don't make requests to quickly
function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve,ms)
  })
}

// get random number for sleep timer
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// this function is called first
const getResults = async () => {
  let productArray = [];
  // Get a database reference to our blog
  let db = admin.database();
  // create db path reference
  let ref = db.ref("scrapedPages/");
  let dateToString = date.toString();
  // prep db references by adding a timestamp
  let pageRefBestSellers = ref.child('OCS-best-sellers-on-' + dateToString);
  let pageRefOCSfullListing = ref.child('OCS-full-product-listing-scrape-on-' + dateToString);
  let pageRefBCfullListing = ref.child('BC-full-product-listing-scrape-on-' + dateToString);
  // best sellers stuff
  let bestSellersArray = [];
  let bestSellersVendor = [];
  let bestSellersTitle = [];
  let bestSellersPlantType = [];
  let bestSellersTHCrange = [];
  let bestSellersCBDrange = [];
  let bestSellersPrice = [];

  let vendor = [];
  let productTitle = [];
  let plantType = [];
  let thcRange = [];
  let cbdRange = [];
  let price = [];



  ///////////////////////////////
  //
  // FETCH FULL LISTING FROM bccannabisstores BELOW
  //
  ///////////////////////////////
  // reset pageNum variable
  pageNum = 1;
  productArray = [];
  productTitle = [];
  plantType = [];
  thcRange = [];
  cbdRange = [];
  price = [];
  vendor = [];
  let totalNumberOfPages = 1;

  // do statement is for the page iterator
  do {
    $ = await fetchDataForBCfullProductListing();
    // only need to do this once
    if (pageNum === 1) {
      totalNumberOfPages = parseInt($('.pagination--inner li:nth-last-child(2) a').text());
    }
    $('.productitem--title a span').each((index, element) => {
      productTitle.push($(element).text());
    });
    $('.productitem--vendor').each((index, element) => {
      vendor.push($(element).text());
    });
    $('.price--main .money').each((index, element) => {
      price.push($(element).text());
    });
    $('.productitem--strain-characteristics span:nth-child(1)').each((index, element) => {
      thcRange.push($(element).text());
    });
    $('.productitem--strain-characteristics span:nth-child(2)').each((index, element) => {
      cbdRange.push($(element).text());
      plantType.push('Not Available');
    });
    // Convert to an array so that we can sort the results.
    // we need the IF because when you click to go to the next page, it just appends the product list with new data
    // so that means that the last page will have all the data, only if we went thru the pages from 1 .. n, one at a time
    if (totalNumberOfPages == pageNum) {
      productArray.push ({
        vendors: [...vendor],
        productTitle: [...productTitle],
        plantType: [...plantType],
        thcRange: [...thcRange],
        cbdRange: [...cbdRange],
        price: [...price],
        date
      });
    };
    pageNum++;
    await sleep(getRandomInt(3000, 8000));
  } while (totalNumberOfPages > pageNum);

  ///////////////////////////////
  //
  // FETCH FULL LISTING FROM bccannabisstores ABOVE
  //
  ///////////////////////////////

  ////////////////////////////////////////
  //
  //  SEND bccannabisstore DATA SETS TO FIREBASE BELOW
  //
  ////////////////////////////////////////
  // send data to DB
  console.log('SENDING BC....')
  pageRefBCfullListing.set(productArray);
  // pageRefBestSellers.set(bestSellersArray);
  ////////////////////////////////////////
  //
  //  SEND bccannabisstore DATA SETS TO FIREBASE ABOVE
  //
  ////////////////////////////////////////


  ///////////////////////////////
  //
  //  FETCH BEST SELLERS FROM OCS BELOW
  //
  ///////////////////////////////
  $ = await fetchDataForOCSbestSellers();
  // grab vendor
  $('.product-carousel__products article h4').each((index, element) => {
    if (index === 0 || index % 3 === 0) {
      bestSellersVendor.push($(element).text());
    }
  });
  // grab title
  $('.product-carousel__products .product-tile__data h3').each((index, element) => {
      bestSellersTitle.push($(element).text());
  });
  // grab plant type
  $('.product-carousel__products .product-tile__properties li:nth-child(1) p').each((index, element) => {
      bestSellersPlantType.push($(element).text());
  });
  // grab thc range
  $('.product-carousel__products .product-tile__properties li:nth-child(2) p').each((index, element) => {
    bestSellersTHCrange.push($(element).text());
  });
  //grab cbd range
  $('.product-carousel__products .product-tile__properties li:nth-child(3) p').each((index, element) => {
    bestSellersCBDrange.push($(element).text());
  });
  $('.product-carousel__products .product-tile__info .product-tile__price').each((index, element) => {
    bestSellersPrice.push($(element).text());
  });

  bestSellersArray.push ({
    vendors: [...bestSellersVendor],
    productTitle: [...bestSellersTitle],
    plantType: [...bestSellersPlantType],
    thcRange: [...bestSellersTHCrange],
    cbdRange: [...bestSellersCBDrange],
    price: [...bestSellersPrice],
    date
  });
  ////////////////////////////////////////
  //
  //  FETCH BEST SELLERS FROM OCS ABOVE
  //
  ////////////////////////////////////////

  ////////////////////////////////////////
  //
  //  FETCH FULL PRODUCT LISTING FROM OCS BELOW
  //
  ////////////////////////////////////////
  vendor = [];
  productTitle = [];
  plantType = [];
  thcRange = [];
  cbdRange = [];
  price = [];
  totalNumberOfPages = 1;
  productArray = [];
  pageNum = 1;

  do {
    $ = await fetchDataForOCSfullProductListings();
    // first check how many total pages there are - only need to do once
    if (pageNum === 1) {
      totalNumberOfPages = parseInt($('.pagination li:nth-last-child(2)').text());
    }
    // use fetched data to grab elements (and their text) and push into arrays defined above
    // get vendor
    $('.product-tile__vendor').each((index, element) => {
      vendor.push($(element).text());
    });
    // grab product title
    $('.product-tile__title').each((index, element) => {
      productTitle.push($(element).text());
     });
    // grab plant type
    $('.product-tile__plant-type').each((index, element) => {
      plantType.push($(element).text());
    });
    // grab thc range
    $('.product-tile__properties  li:nth-child(2) p').each((index, element) => {
      thcRange.push($(element).text());
    });
    // grab cbd range
    $('.product-tile__properties  li:nth-child(3) p').each((index, element) => {
      cbdRange.push($(element).text());
    });
    // grab price
    $('.product-tile__price').each((index, element) => {
      price.push($(element).text());
    });

    // increment page number to get more products if the page count is less than total number of pages
    if (pageNum <= totalNumberOfPages) {
      pageNum ++;
    };
    // Convert to an array so that we can sort the results.
    // we need the IF because when you click to go to the next page, it just appends the product list with new data
    // so that means that the last page will have all the data, only if we went thru the pages from 1 .. n, one at a time
    if (totalNumberOfPages == pageNum) {
      productArray.push ({
        vendors: [...vendor],
        productTitle: [...productTitle],
        plantType: [...plantType],
        thcRange: [...thcRange],
        cbdRange: [...cbdRange],
        price: [...price],
        date
      });
    }
    pageNum++;
    await sleep(getRandomInt(3000, 8000));
  } while (totalNumberOfPages > pageNum);
  ////////////////////////////////////////
  //
  //  FETCH FULL PRODUCT LISTING FROM OCS ABOVE
  //
  ////////////////////////////////////////

  ////////////////////////////////////////
  //
  //  SEND OCS DATA SETS TO FIREBASE BELOW
  //
  ////////////////////////////////////////
  // send data to DB
  console.log('SENDING OCS FULL LIST....')
  pageRefOCSfullListing.set(productArray);
  console.log('SENDING OCS BEST SELLERS....')
  pageRefBestSellers.set(bestSellersArray);
  ////////////////////////////////////////
  //
  //  SEND OCS DATA SETS TO FIREBASE ABOVE
  //
  ////////////////////////////////////////
  return productArray;
};

module.exports = getResults;

// figure out what type of product
// How to figure out what the product is
// OIL => price == per bottle && name !HAS "spray"
// DRY BUD => price == per gram
// PRE-ROLL => price == per pack
// CAPSULE => price == per bottle && name HAS "gels" or "capsules"
