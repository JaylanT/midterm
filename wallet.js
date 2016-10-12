#!/usr/bin/env node

const request = require('request');
const csv = require('csv');
const fs = require('fs');
const json2csv = require('json2csv');

const URL = 'https://coinbase.com/api/v1/currencies/exchange_rates';
const BUY = 'BUY';
const SELL = 'SELL';
const CSVFILE_DEFAULT = 'orders.csv';

function buy(amount, currency) {
	initiateTransaction(amount, currency, BUY);
}

function sell(amount, currency) {
	initiateTransaction(amount, currency, SELL);
}

function orders() {
    const csv = json2csv({ data: ordersQueue, hasCSVColumnTitle: false });
    fs.writeFileSync(CSVFILE_DEFAULT, csv);

    csv2console(CSVFILE_DEFAULT);
}

function initiateTransaction(amount, currency, type) {
	if (isNaN(amount) || amount <= 0) {
		console.log('No amount specified');
		return;
	}
	
	getBTCConversions((conversions) => {
		const transaction = createTransaction(amount, currency, type, conversions);

		if (transaction) {
			ordersQueue.push(transaction);
			printTransaction(transaction);
            orders();
		}
	});
}

function createTransaction(amount, currency, type, conversions) {
	const transaction = {
		amount: amount,
		timestamp: new Date().toUTCString(),
		type: type,
        currency: null,
        convertedValue: null,
        BTCValue: null
	}

	if (currency) {
		const key1 = currency.toLowerCase() + '_to_btc';
		const conversionValue = conversions[key1];
		const key2 = 'btc_to_' + currency.toLowerCase();
		const BTCValue = conversions[key2];

		if (conversionValue === undefined) {
			console.log('No known exchange rate for BTC/' + currency + '. Order failed');
			return;
		}

		transaction.currency = currency.toUpperCase();
		transaction.convertedValue = conversionValue;
		transaction.BTCValue = BTCValue;
	}

	return transaction;
}

function getBTCConversions(callback) {
	request(URL, (err, res, body) => {
		if (!err && res.statusCode == 200) {
			const conversions = JSON.parse(body);

			callback(conversions);
		}
	});
}

function printTransaction(transaction) {
	if (transaction.currency) {
		console.log('Order to ' + transaction.type + ' ' + transaction.amount + ' ' + transaction.currency + ' worth of BTC queued @ ' + transaction.BTCValue + ' BTC/' + transaction.currency + ' (' + transaction.convertedValue + ' BTC)');
	} else {
		console.log('Order to ' + transaction.type + ' ' + transaction.amount + ' BTC queued');
	}
}

function csv2console(csvfile) {
    const parser = csv.parse();
    parser.on('readable', () => {
        while (row = parser.read()) {
            const amount = row[0];
            const timestamp = row[1];
            const type = row[2];
            const currency = row[3] ? row[3] : 'BTC';
            const convertedValue = row[4];
            const BTCValue = row[5];

            console.log(timestamp + ' : ' + type + ' ' + amount + ' ' + currency + ' : Unfilled');
        }
    });
    parser.on('error', (err) => {
        console.log(err.message);
    });
    fs.createReadStream(csvfile).pipe(parser);
}

const ordersQueue = [];

buy(20, 'usd');
buy(20, 'GBP');
buy(200, 'HKD');
buy(10);
