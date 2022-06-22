import { CCodeConverter, CCodeTable, DecodedGenre } from "./codeconverter";
import { BookInfo } from "./main";

describe("test Ccode converter", () => {

    let sampleCodeTable = <CCodeTable>{
        taishou: {
            "0": "一般",
            "1": "教養",
        },

        keitai: {
            "0": "単行本",
            "1": "文庫",
        },

        naiyou: {
            "00": "総記",
            "41": "数学",
        }
    };

    test("convert ccode correctly", () => {

        let inputCcode = "0141";
        let expectedDecoded = <DecodedGenre>{
            ccode: "0141",
            target: "一般",
            format: "文庫",
            genre: "数学",
        }

        let converter = new CCodeConverter(sampleCodeTable);
        let actualDecoded = converter.convert(inputCcode);

        expect(actualDecoded).toStrictEqual(expectedDecoded);
    });

    test("return null when input ccode is invalid: contains non-number", () => {
        let inputCcode = "0X01";
        let expectedDecoded = null;

        let converter = new CCodeConverter(sampleCodeTable);
        let actualDecoded = converter.convert(inputCcode);

        expect(actualDecoded).toStrictEqual(expectedDecoded);

    });

    test("return null when input ccode is invalid: fewer than 4 digits", () => {
        let inputCcode = "101";
        let expectedDecoded = null;

        let converter = new CCodeConverter(sampleCodeTable);
        let actualDecoded = converter.convert(inputCcode);

        expect(actualDecoded).toStrictEqual(expectedDecoded);

    });

    test("return empty field when translation failed", () => {

        let inputCcode = "2022";
        let expectedDecoded = <DecodedGenre>{
            ccode: "2022",
            target: "",
            format: "単行本",
            genre: "",
        }

        let converter = new CCodeConverter(sampleCodeTable);
        let actualDecoded = converter.convert(inputCcode);

        expect(actualDecoded).toStrictEqual(expectedDecoded);

    });

});

test("update genre correctly", () => {
    let sampleBookInfo = new BookInfo(
        "ご冗談でしょう、tatamiyaさん - tatamiya tamiya(著 / 文) | 畳屋書店",
        "http://example.com/bd/isbn/1111111111111",
        "Sun, 31 Mar 2024 00:00:00+0900",
        ["自然科学", "文庫"],
    );
    let inputGenre = <DecodedGenre>{
        ccode: "0142",
        target: "一般",
        format: "文庫",
        genre: "物理学",
    }

    sampleBookInfo.updateGenre(inputGenre);

    expect(sampleBookInfo.target).toBe("一般");
    expect(sampleBookInfo.format).toBe("文庫");
    expect(sampleBookInfo.genre).toBe("物理学");
})