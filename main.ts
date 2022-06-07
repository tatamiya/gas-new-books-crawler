function crawlingNewBooks() {
  var url: string = "https://www.hanmoto.com/ci/bd/search/hdt/%E6%96%B0%E3%81%97%E3%81%8F%E7%99%BB%E9%8C%B2%E3%81%95%E3%82%8C%E3%81%9F%E6%9C%AC/sdate/today/created/today/order/desc/vw/rss20"


  let xml: string = UrlFetchApp.fetch(url).getContentText();

  let bookList: BookList = parseXML(xml);

  let pubDateJST = bookList.uploadDate.toLocaleDateString('japanese', { year: 'numeric', month: 'long', day: 'numeric' });
  let activeSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let todaysSheet: GoogleAppsScript.Spreadsheet.Sheet = createOrReplaceSheet(activeSpreadsheet, pubDateJST)

  // Fetch additional information from openBD API and add to book info.
  bookList.books.forEach(async book => {
    let isbn = book.isbn;
    let openbdRes = await requestOpenbd(isbn);
    if (openbdRes !== null) {
      book.addInfoFromOpenbd(openbdRes);
    }
  });

  bookList.toRows().forEach(row => {

    // ISBN, PublishDate, Title+Authors, Category, URL
    todaysSheet!.appendRow(row.toArray());
  });
}

function createOrReplaceSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, name: string): GoogleAppsScript.Spreadsheet.Sheet {

  let namedSheet = ss.getSheetByName(name);
  if (namedSheet != null) {
    ss.deleteSheet(namedSheet);
  }

  let newSheet = ss.insertSheet(name);

  return newSheet
}

interface openbdResponse {
  isbn: string;
  title: string;
  volume: string;
  series: string;
  publisher: string;
  pubdate: string;
  cover: string;
  author: string;
  datemodified: string;
  datecreated: string;
  datekoukai: string;
  ccode: string;
}

async function requestOpenbd(isbn: string): Promise<openbdResponse | null> {
  let url = `https://api.openbd.jp/v1/get?isbn=${isbn}&pretty`
  let res = await fetch(url);
  let jsonResp = await res.json();

  if (jsonResp === null || jsonResp[0] === null) {
    return null
  }

  let subject = jsonResp[0]["onix"]["DescriptiveDetail"]["Subject"];
  let ccode: string;
  if (typeof subject === "undefined" || subject.length === 0) {
    ccode = "";
  } else {
    ccode = subject[0]["SubjectCode"];
  }

  let hanmoto = jsonResp[0]["hanmoto"];
  if (typeof hanmoto === "undefined") {
    hanmoto = { datemodified: "", datekoukai: "", datecreated: "" };
  }

  let parsedResp = {
    ...hanmoto,
    ...jsonResp[0]["summary"],
    ccode: ccode
  } as openbdResponse

  return parsedResp
}

class BookList {
  public uploadDate: Date;
  private lastUpdatedDate: Date;

  public books: Array<BookInfo> = [];

  constructor(createdDate: string, lastUpdatedDate: string) {
    this.uploadDate = new Date(createdDate)
    this.lastUpdatedDate = new Date(lastUpdatedDate);
  }

  addBook(book: BookInfo) {
    this.books.push(book)
  }

  toRows(): Array<SheetRow> {
    let header = new SheetRow(
      'ISBN',
      '出版予定日',
      'タイトル・著者・出版社',
      '著者',
      '出版社',
      'シリーズ',
      '巻',
      'カテゴリー',
      'ccode',
      'Hanmoto URL',
      'リスト作成日時',
      '最終更新日時',
    );

    let rows: Array<SheetRow> = [header];
    this.books.forEach(newBook => {

      let row = new SheetRow(
        newBook.extractISBN(),
        newBook.pubDate.toISOString(),
        newBook.title,
        newBook.authors,
        newBook.publisher,
        newBook.series,
        newBook.volume,
        newBook.categories.join(', '),
        newBook.ccode,
        newBook.url,
        this.uploadDate.toISOString(),
        this.lastUpdatedDate.toISOString(),
      )
      rows.push(row);
    });

    return rows
  }
}

class SheetRow {

  constructor(
    private isbn: string,
    private pubDate: string,
    private title: string,
    private author: string,
    private publisher: string,
    private series: string,
    private volume: string,
    private categories: string,
    private ccode: string,
    private url: string,
    private createdDate: string,
    private lastUpdatedDate: string
  ) {
  }

  toArray(): Array<string> {
    return [
      this.isbn,
      this.pubDate,
      this.title,
      this.author,
      this.publisher,
      this.series,
      this.volume,
      this.categories,
      this.ccode,
      this.url,
      this.createdDate,
      this.lastUpdatedDate
    ]
  }

}

class BookInfo {
  public isbn: string;
  public title: string;
  public url: string;
  public authors: string = "";
  public series: string = "";
  public volume: string = "";
  public publisher: string = "";
  public ccode: string = "";
  public createdDate: Date = new Date("");
  public lastUpdatedDate: Date = new Date("");
  public pubDate: Date;
  public categories: Array<string>;

  constructor(title: string, url: string, pubDate: string, categories: Array<string>) {
    this.title = title;
    this.url = url;
    this.pubDate = new Date(pubDate);
    this.categories = categories;
    this.isbn = this.extractISBN();
  }

  extractISBN(): string {
    let split_url = this.url.split('/')
    let isbn = split_url[split_url.length - 1];
    return isbn
  }

  addInfoFromOpenbd(resp: openbdResponse) {
    if (resp.title !== "") {
      this.title = resp.title;
    }
    this.authors = resp.author;
    this.series = resp.series;
    this.volume = resp.volume;
    this.publisher = resp.publisher;
    this.ccode = resp.ccode;
    this.createdDate = new Date(resp.datecreated);
    this.lastUpdatedDate = new Date(resp.datemodified);


  }
}

function parseXML(xml: string): BookList {
  let document = XmlService.parse(xml);
  let root = document.getRootElement();

  let channel = root.getChild('channel');
  let listPubDateText = channel.getChild('pubDate').getText();
  let listUpdateDateText = channel.getChild('lastBuildDate').getText();

  let bookList = new BookList(listPubDateText, listUpdateDateText);

  let items = channel.getChildren('item');
  items.forEach(item => {
    let title = item.getChild('title').getText();
    let url = item.getChild('link').getText();

    let pubDateText = item.getChild('pubDate').getText();

    let categoryElement = item.getChildren('category');
    let categories = categoryElement.map(category => category.getText());

    let book = new BookInfo(title, url, pubDateText, categories);
    bookList.addBook(book)
  });
  return bookList
}

export { crawlingNewBooks, parseXML, BookList, BookInfo, SheetRow, openbdResponse, requestOpenbd };
