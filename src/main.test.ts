import * as codeconverter from "./codeconverter";
import { BookInfo, BookList, openbdResponse, requestOpenbdAndParse, SheetRow, updateBookInformation } from "./main";

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
    // TODO: add a test case for error response.
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

    describe("test openBD requesting and parsing", () => {

        test("request Openbd API and parse the response", async () => {
            let mockOpenbdResponse = [
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
            ];
            // As to mock of fetch, see https://www.leighhalliday.com/mock-fetch-jest
            global.fetch = jest.fn().mockImplementation(async () => Promise.resolve({
                json: () => Promise.resolve(mockOpenbdResponse),
            })
            );

            let inputISBN = '1111111111111';
            let expectedResponse: openbdResponse = {
                isbn: '1111111111111',
                title: 'ご冗談でしょう、tatamiyaさん',
                volume: '1',
                series: 'シリーズ畳の不思議',
                publisher: '畳屋書店',
                pubdate: '20240531',
                cover: 'https://cover.openbd.jp/9784416522516.jpg',
                author: 'tatamiya tamiya／著 畳の科学／編集',
                datemodified: '2024-05-17 10:05:43',
                datecreated: '2024-05-15 10:04:37',
                datekoukai: '2024-05-15',
                ccode: "1040"
            };

            let actualResponse = await requestOpenbdAndParse(inputISBN);
            expect(actualResponse).toStrictEqual(expectedResponse);

        });

        test("return null when the openBD API response is null", async () => {
            let mockOpenbdResponse = [null];
            // As to mock of fetch, see https://www.leighhalliday.com/mock-fetch-jest
            global.fetch = jest.fn().mockImplementation(async () => Promise.resolve({
                json: () => Promise.resolve(mockOpenbdResponse),
            })
            );

            let inputISBN = '1111111111111';
            let expectedResponse = null;
            let actualResponse = await requestOpenbdAndParse(inputISBN);
            expect(actualResponse).toStrictEqual(expectedResponse);
        });

        test("return null when the summary field of the response is missing", async () => {
            let mockOpenbdResponse = [
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
                }
            ];
            // As to mock of fetch, see https://www.leighhalliday.com/mock-fetch-jest
            global.fetch = jest.fn().mockImplementation(async () => Promise.resolve({
                json: () => Promise.resolve(mockOpenbdResponse),
            })
            );

            let inputISBN = '1111111111111';
            let expectedResponse = null;
            let actualResponse = await requestOpenbdAndParse(inputISBN);
            expect(actualResponse).toStrictEqual(expectedResponse);
        });

        test("return with empty ccode field when the openBD API response does not have Subject field", async () => {
            let mockOpenbdResponse = [
                {
                    "onix": {
                        "DescriptiveDetail": {
                            "contributor": "hoge",
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
            ];
            // As to mock of fetch, see https://www.leighhalliday.com/mock-fetch-jest
            global.fetch = jest.fn().mockImplementation(async () => Promise.resolve({
                json: () => Promise.resolve(mockOpenbdResponse),
            })
            );

            let inputISBN = '1111111111111';
            let expectedResponse: openbdResponse = {
                isbn: '1111111111111',
                title: 'ご冗談でしょう、tatamiyaさん',
                volume: '1',
                series: 'シリーズ畳の不思議',
                publisher: '畳屋書店',
                pubdate: '20240531',
                cover: 'https://cover.openbd.jp/9784416522516.jpg',
                author: 'tatamiya tamiya／著 畳の科学／編集',
                datemodified: '2024-05-17 10:05:43',
                datecreated: '2024-05-15 10:04:37',
                datekoukai: '2024-05-15',
                ccode: ""
            };

            let actualResponse = await requestOpenbdAndParse(inputISBN);
            expect(actualResponse).toStrictEqual(expectedResponse);

        });

        test("return with empty fields when hanmoto fields are missing in API response.", async () => {
            let mockOpenbdResponse = [
                {
                    "onix": {
                        "DescriptiveDetail": {
                            "Subject": [{ "SubjectCode": "1040" }]
                        }
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
            ];
            // As to mock of fetch, see https://www.leighhalliday.com/mock-fetch-jest
            global.fetch = jest.fn().mockImplementation(async () => Promise.resolve({
                json: () => Promise.resolve(mockOpenbdResponse),
            })
            );

            let inputISBN = '1111111111111';
            let expectedResponse: openbdResponse = {
                isbn: '1111111111111',
                title: 'ご冗談でしょう、tatamiyaさん',
                volume: '1',
                series: 'シリーズ畳の不思議',
                publisher: '畳屋書店',
                pubdate: '20240531',
                cover: 'https://cover.openbd.jp/9784416522516.jpg',
                author: 'tatamiya tamiya／著 畳の科学／編集',
                datemodified: '',
                datecreated: '',
                datekoukai: '',
                ccode: "1040"
            };

            let actualResponse = await requestOpenbdAndParse(inputISBN);
            expect(actualResponse).toStrictEqual(expectedResponse);

        });

    })

    test("add detailed information to BookInfo from Openbd API response", () => {
        let inputParsedResponse: openbdResponse = {
            isbn: '1111111111111',
            title: 'ご冗談でしょう、tatamiyaさん',
            volume: '1',
            series: 'シリーズ畳の不思議',
            publisher: '畳屋書店',
            pubdate: '20240531',
            cover: 'https://cover.openbd.jp/9784416522516.jpg',
            author: 'tatamiya tamiya／著 畳の科学／編集',
            datemodified: '2024-05-17 10:05:43',
            datecreated: '2024-05-15 10:04:37',
            datekoukai: '2024-05-15',
            ccode: "1040"
        };

        let sampleBookInfo = new BookInfo(
            "ご冗談でしょう、tatamiyaさん - tatamiya tamiya(著 / 文) | 畳屋書店",
            "http://example.com/bd/isbn/1111111111111",
            "Sun, 31 Mar 2024 00:00:00+0900",
            [""],
        );

        sampleBookInfo.addInfoFromOpenbd(inputParsedResponse);

        expect(sampleBookInfo.authors).toStrictEqual('tatamiya tamiya／著 畳の科学／編集');
        expect(sampleBookInfo.title).toStrictEqual('ご冗談でしょう、tatamiyaさん');
        expect(sampleBookInfo.series).toStrictEqual('シリーズ畳の不思議');
        expect(sampleBookInfo.volume).toStrictEqual('1');
        expect(sampleBookInfo.publisher).toStrictEqual('畳屋書店');
        expect(sampleBookInfo.ccode).toStrictEqual('1040');
        expect(sampleBookInfo.createdDate).toStrictEqual(new Date('2024-05-15 10:04:37'));
        expect(sampleBookInfo.lastUpdatedDate).toStrictEqual(new Date('2024-05-17 10:05:43'));
    });

    test("generate sheet rows from BookList", () => {
        let inputBookList = mockBookList;

        let actualSeetRows = inputBookList.toRows();

        expect(actualSeetRows.length).toBe(3);

        let expectedHeaderRow = new SheetRow(
            'ISBN',
            '出版予定日',
            'タイトル・著者・出版社',
            '著者',
            '出版社',
            'シリーズ',
            '巻',
            'カテゴリー',
            'ccode',
            '対象',
            '形態',
            '内容',
            'Hanmoto URL',
            'リスト作成日時',
            '最終更新日時',
        );
        expect(actualSeetRows[0]).toStrictEqual(expectedHeaderRow);

        let expectedSecondRow = new SheetRow(
            "1111111111111",
            "2024-03-30T15:00:00.000Z",
            "ご冗談でしょう、tatamiyaさん - tatamiya tamiya(著 / 文) | 畳屋書店",
            "",
            "",
            "",
            "",
            "自然科学, 文庫",
            "",
            "",
            "",
            "",
            "http://example.com/bd/isbn/1111111111111",
            "2122-04-05T14:04:52.000Z",
            "2122-04-05T14:04:52.000Z",
        )
        expect(actualSeetRows[1]).toStrictEqual(expectedSecondRow);
    });


    test("update BookInfo correctly", async () => {
        jest.mock('./codeconverter')

        jest.spyOn(codeconverter, 'initializeCcodeConverter').mockImplementation(() => {
            return new codeconverter.CCodeConverter(<codeconverter.CCodeTable>{
                taishou: {
                    "0": "一般",
                    "1": "教養",
                    "3": "専門書",
                },

                keitai: {
                    "0": "単行本",
                    "1": "文庫",
                },

                naiyou: {
                    "40": "自然科学総記",
                    "42": "物理学",
                }
            }
            )
        });

        // As to mock of fetch, see https://www.leighhalliday.com/mock-fetch-jest
        global.fetch = jest.fn().mockImplementation(async function (url) {
            let mockOpenbdResponse = [
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
            ];
            if (url !== "https://api.openbd.jp/v1/get?isbn=1111111111111&pretty") {
                return Promise.resolve({
                    json: () => Promise.resolve([null]),
                });
            }
            return Promise.resolve({
                json: () => Promise.resolve(mockOpenbdResponse),
            });
        }
        );

        let updatedBookList = await updateBookInformation(mockBookList);

        expect(updatedBookList.books[0].title).toBe("ご冗談でしょう、tatamiyaさん");
        expect(updatedBookList.books[0].authors).toBe("tatamiya tamiya／著 畳の科学／編集");
        expect(updatedBookList.books[0].publisher).toBe("畳屋書店");
        expect(updatedBookList.books[0].ccode).toBe("1040");
        expect(updatedBookList.books[0].genre).toBe("自然科学総記");

        expect(updatedBookList.books[1].title).toBe("流体力学（後編） - 今井功(著 / 文) | 裳華房");
        expect(updatedBookList.books[1].authors).toBe("");
        expect(updatedBookList.books[1].publisher).toBe("");
        expect(updatedBookList.books[1].ccode).toBe("");
        expect(updatedBookList.books[1].genre).toBe("");
    })


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

        main.requestOpenbd = jest.fn().mockImplementation(async isbn => {
            if (isbn === "1111111111111") {
                return {
                    isbn: '1111111111111',
                    title: 'ご冗談でしょう、tatamiyaさん',
                    volume: '1',
                    series: 'シリーズ畳の不思議',
                    publisher: '畳屋書店',
                    pubdate: '20240531',
                    cover: 'https://cover.openbd.jp/9784416522516.jpg',
                    author: 'tatamiya tamiya／著 畳の科学／編集',
                    datemodified: '2024-05-17 10:05:43',
                    datecreated: '2024-05-15 10:04:37',
                    datekoukai: '2024-05-15',
                    ccode: "1040"
                } as openbdResponse
            } else if (isbn === "9999999999999") {
                return {
                    isbn: "9999999999999",
                    title: "流体力学（後編）",
                    volume: "24",
                    series: "物理学選書",
                    publisher: "裳華房",
                    pubdate: "21240229",
                    cover: "",
                    author: "今井功",
                    datemodified: "2124-01-01 10:05:43",
                    datecreated: "2124-01-01 10:05:43",
                    datekoukai: "2124-01-01",
                    ccode: "3042",
                } as openbdResponse
            } else {
                return null
            }
        });

        main.crawlingNewBooks()

    });
});

