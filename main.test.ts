import { BookInfo, BookList } from "./main";

var inputXML = `
    <rss xmlns: content = "http://purl.org/rss/1.0/modules/content/" xmlns: admin = "http://webns.net/mvcb/" xmlns: rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns: dc = "http://purl.org/dc/elements/1.1/" xmlns: sy = "http://purl.org/rss/1.0/modules/syndication/" version = "2.0">
    <channel>
        <pubDate>Tue, 05 Apr 2122 23:04:52+0900</pubDate>
        <lastBuildDate> Tue, 05 Apr 2122 23:04:52+0900 </lastBuildDate>
        <item>
            <title>
                <![CDATA[ご冗談でしょう、tatamiyaさん - tatamiya tamiya(著 / 文) | 畳屋書店 ]]>
            </title>
            <pubDate> Sun, 31 Mar 2024 00:00:00+0900 </pubDate>
            <link> http://example.com/bd/isbn/1111111111111</link>
            < category >
                <![CDATA[自然科学]]>
            </category>
        </item>
        < item >
            <title>
            <![CDATA[流体力学（後編） - 今井功(著 / 文) | 裳華房]]>
                </title>
                <pubDate > Thu, 29 Feb 2124 00:00:00+0900 </pubDate>
                <link> http://example.com/bd/isbn/9999999999999</link>
        </item>
    </channel>
    </rss>
`;

class SpreadsheetAppMock {
    public sheet: SpreadsheetMock;

    constructor(name: string) {
        this.sheet = new SpreadsheetMock(name);
    }

    getSheetByName(name: string): SpreadsheetMock | null {
        if (this.sheet.name === name) {
            return this.sheet
        } else {
            return null;
        }
    }

    deleteSeet(name: string) {
        if (this.sheet.name === name) {
            this.sheet = new SpreadsheetMock("deleted");
        }
    }

    insertSheet(name: string): SpreadsheetMock {
        if (this.sheet.name === name) {
            return this.sheet;
        } else {
            this.sheet = new SpreadsheetMock(name);
            return this.sheet
        }
    }
}


class SpreadsheetMock {
    public name: string;
    public rows: Array<Array<string>>;

    constructor(sheetName: string) {
        this.name = sheetName;
        this.rows = [];
    }

    appendRow(bookInfo: Array<string>) {
        this.rows.push(bookInfo);
    }
}


var mockBooksInfo: Array<BookInfo> = [
    {
        title: "ご冗談でしょう、tatamiyaさん - tatamiya tamiya(著 / 文) | 畳屋書店",
        url: "http://example.com/bd/isbn/1111111111111",
        pubDate: new Date("Sun, 31 Mar 2024 00:00:00+0900"),
        categories: ["自然科学"],
    } as BookInfo,
    {
        title: "流体力学（後編） - 今井功(著 / 文) | 裳華房",
        url: "http://example.com/bd/isbn/9999999999999",
        pubDate: new Date("Thu, 29 Feb 2124 00:00:00+0900"),
        categories: [""],
    } as BookInfo,
]

var mockBookList: BookList = {
    createdDate: new Date("Tue, 05 Apr 2122 23:04:52+0900"),
    lastUpdatedDate: new Date("Tue, 05 Apr 2122 23:04:52+0900"),
    books: mockBooksInfo,
} as BookList;

describe("main.ts", () => {
    test("integration test", () => {
        UrlFetchApp.fetch = jest.fn().mockImplementation(_ => {
            return {
                getContentText: jest.fn().mockImplementation(() => {
                    return { inputXML }
                })
            };
        });

        let initialSpreadSheetApp: SpreadsheetAppMock = new SpreadsheetAppMock("2122年5月4日");
        SpreadsheetApp.getActiveSpreadsheet = jest.fn().mockImplementation(() => {
            return initialSpreadSheetApp;
        });

        jest.mock("./main");
        const main = require("./main");
        main.parseXML = jest.fn().mockImplementation(_ => {
            return mockBookList
        })

        main.crawlingNewBooks()

    });
});

