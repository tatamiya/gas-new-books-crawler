function crawlingNewBooks() {
  var url: string = "https://www.hanmoto.com/ci/bd/search/hdt/%E6%96%B0%E3%81%97%E3%81%8F%E7%99%BB%E9%8C%B2%E3%81%95%E3%82%8C%E3%81%9F%E6%9C%AC/sdate/today/created/today/order/desc/vw/rss20"


  let xml: string = UrlFetchApp.fetch(url).getContentText();

  let bookList: BookList = parseXML(xml);

  let pubDateJST = bookList.createdDate.toLocaleDateString('japanese', { year: 'numeric', month: 'long', day: 'numeric' });
  let activeSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let todaysSheet: GoogleAppsScript.Spreadsheet.Sheet = createOrReplaceSheet(activeSpreadsheet, pubDateJST)

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

class BookList {
  public createdDate: Date;
  public lastUpdatedDate: Date;

  public books: Array<BookInfo> = [];

  constructor(document: GoogleAppsScript.XML_Service.Document) {
    let root = document.getRootElement();

    let channel = root.getChild('channel');
    let listPubDateText = channel.getChild('pubDate').getText();
    this.createdDate = new Date(listPubDateText);//.toISOString();
    let listUpdateDateText = channel.getChild('lastBuildDate').getText();
    this.lastUpdatedDate = new Date(listUpdateDateText);//.toISOString();

    let items = channel.getChildren('item');
    items.forEach(item => {
      let book = new BookInfo(item);
      this.books.push(book);
    });
  }

  toRows(): Array<SheetRow> {
    let header = new SheetRow(
      'ISBN',
      '出版予定日',
      'タイトル・著者・出版社',
      'カテゴリー',
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
        newBook.categories.join(', '),
        newBook.url,
        this.createdDate.toISOString(),
        this.lastUpdatedDate.toISOString(),
      )
      rows.push(row);
    });

    return rows
  }
}

class SheetRow {
  private isbn: string;
  private pubDate: string;
  private title: string;
  private categories: string;
  private url: string;
  private createdDate: string;
  private lastUpdatedDate: string;

  constructor(isbn: string, pubDate: string, title: string, categories: string, url: string, createdDate: string, lastUpdatedDate: string) {
    this.isbn = isbn;
    this.pubDate = pubDate;
    this.title = title;
    this.categories = categories;
    this.url = url;
    this.createdDate = createdDate;
    this.lastUpdatedDate = lastUpdatedDate;
  }

  toArray(): Array<string> {
    return [this.isbn, this.pubDate, this.title, this.categories, this.url, this.createdDate, this.lastUpdatedDate]
  }

}

class BookInfo {
  public title: string;
  public url: string;
  public pubDate: Date;
  public categories: Array<string>;

  constructor(item: GoogleAppsScript.XML_Service.Element) {
    this.title = item.getChild('title').getText();
    this.url = item.getChild('link').getText();

    let pubDateText = item.getChild('pubDate').getText();
    this.pubDate = new Date(pubDateText);

    let categories = item.getChildren('category');
    this.categories = categories.map(category => category.getText());
  }

  extractISBN(): string {
    let split_url = this.url.split('/')
    let isbn = split_url[split_url.length - 1];
    return isbn
  }
}

function parseXML(xml: string): BookList {
  let document = XmlService.parse(xml);
  return new BookList(document)
}

export { crawlingNewBooks, parseXML, BookList, BookInfo, SheetRow };
