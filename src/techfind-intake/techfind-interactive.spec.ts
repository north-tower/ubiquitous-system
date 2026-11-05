import {
  techfindPlaaggFinishButtons,
  techfindPlaaggFinishList,
  techfindTopMenuButtons,
} from './techfind-interactive';
import { WHATSAPP_REPLY_BUTTON_TITLE_MAX } from '../outbound/whatsapp-reply-buttons';

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

  it('opens with three top-level menu reply buttons', () => {
    const menu = techfindTopMenuButtons();
    expect(menu.buttons).toHaveLength(3);
    for (const button of menu.buttons) {
      expect(button.title.length).toBeLessThanOrEqual(
        WHATSAPP_REPLY_BUTTON_TITLE_MAX,
      );
    }
    expect(menu.fallbackText).toMatch(/Reply with a number \(1–7\)/);
  });
});
