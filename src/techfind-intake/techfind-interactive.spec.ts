import {
  techfindPlaaggFinishButtons,
  techfindPlaaggFinishList,
} from './techfind-interactive';

describe('techfind interactive outbound', () => {
  it('builds a PLAAGG finish list with four row ids', () => {
    const list = techfindPlaaggFinishList('What would you like next?');
    expect(list.sections[0].rows).toHaveLength(4);
    expect(list.sections[0].rows[0].rowId).toBe('book_demo');
  });

  it('builds three PLAAGG finish reply buttons plus plan hint in fallback', () => {
    const buttons = techfindPlaaggFinishButtons(
      'What would you like next?\n\n1  Book a demo',
    );
    expect(buttons.buttons).toHaveLength(3);
    expect(buttons.buttons.map((row) => row.id)).toEqual([
      'book_demo',
      'speak_to_techfind',
      'try_another',
    ]);
    expect(buttons.fallbackText).toMatch(/recommended PLAAGG plan/i);
  });

});
