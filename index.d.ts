// Type definitions for jsreport-jsrender 1.0
// Project: https://github.com/jsreport/jsreport
// Definitions by: pofider <https://github.com/pofider>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.3

// import all availible types for jsreport included extensions 
import JsReportChromePdf = require('jsreport-chrome-pdf')
import JsReportJsRender = require('jsreport-jsrender')
import JReportHtmlToXlsx = require('jsreport-html-to-xlsx')
import JsReportXlsx = require('jsreport-xlsx')

// just reexport types from core
import JsReport = require('jsreport-core');
export = JsReport;
