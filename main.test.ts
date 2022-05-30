import { BookInfo, BookList, SheetRow } from "./main";

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

var mockOpenbdResponse = [
    {
        "onix": {
            "DescriptiveDetail": {
                "Subject": [{ "SubjectCode": "1040" }]
            }
        },
        "hanmoto": {
            "datemodified": '2024-05-17 10:05:43',
            "datecreated": '2024-05-15 10:04:37',
            "datekoukai": '2024-05-15'
        },
        "summary": {
            "isbn": '1111111111111',
            "title": 'ご冗談でしょう、tatamiyaさん',
            "volume": '1',
            "series": 'シリーズ畳の不思議',
            "publisher": '畳屋書店',
            "pubdate": '20240531',
            "cover": 'https://cover.openbd.jp/9784416522516.jpg',
            "author": 'tatamiya tamiya／著 畳の科学／編集'

        }
    }
]

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
    new BookInfo(
        "ご冗談でしょう、tatamiyaさん - tatamiya tamiya(著 / 文) | 畳屋書店",
        "http://example.com/bd/isbn/1111111111111",
        "Sun, 31 Mar 2024 00:00:00+0900",
        ["自然科学", "文庫"],
    ),
    new BookInfo(
        "流体力学（後編） - 今井功(著 / 文) | 裳華房",
        "http://example.com/bd/isbn/9999999999999",
        "Thu, 29 Feb 2124 00:00:00+0900",
        [""],
    ),
];
var mockBookList: BookList = new BookList("Tue, 05 Apr 2122 23:04:52+0900", "Tue, 05 Apr 2122 23:04:52+0900");
mockBooksInfo.forEach(bookInfo => {
    mockBookList.addBook(bookInfo);
});


describe("main.ts", () => {

    test("extract ISBN from URL in BookInfo", () => {
        let inputBookInfo = new BookInfo(
            "ご冗談でしょう、tatamiyaさん - tatamiya tamiya(著 / 文) | 畳屋書店",
            "http://example.com/bd/isbn/1111111111111",
            "Sun, 31 Mar 2024 00:00:00+0900",
            [""],
        )
        let expectedISBN = "1111111111111";
        let actualISBN = inputBookInfo.isbn;

        expect(actualISBN).toBe(expectedISBN);
    });

    test("generate sheet rows from BookList", () => {
        let inputBookList = mockBookList;

        let actualSeetRows = mockBookList.toRows();

        expect(actualSeetRows.length).toBe(3);

        let expectedHeaderRow = new SheetRow(
            'ISBN',
            '出版予定日',
            'タイトル・著者・出版社',
            'カテゴリー',
            'Hanmoto URL',
            'リスト作成日時',
            '最終更新日時',
        );
        expect(actualSeetRows[0]).toStrictEqual(expectedHeaderRow);

        let expectedSecondRow = new SheetRow(
            "1111111111111",
            "2024-03-30T15:00:00.000Z",
            "ご冗談でしょう、tatamiyaさん - tatamiya tamiya(著 / 文) | 畳屋書店",
            "自然科学, 文庫",
            "http://example.com/bd/isbn/1111111111111",
            "2122-04-05T14:04:52.000Z",
            "2122-04-05T14:04:52.000Z",
        )
        expect(actualSeetRows[1]).toStrictEqual(expectedSecondRow);
    });

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

