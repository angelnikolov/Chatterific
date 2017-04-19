import { CSRPage } from './app.po';

describe('csr App', () => {
  let page: CSRPage;

  beforeEach(() => {
    page = new CSRPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
