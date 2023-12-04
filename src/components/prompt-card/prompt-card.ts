import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import d3 from '../../utils/d3-import';
import {
  customElement,
  property,
  state,
  query,
  queryAsync
} from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

// Types
import type { PromptDataRemote } from '../../types/promptlet';

import componentCSS from './prompt-card.css?inline';

/**
 * Prompt card element.
 *
 */
@customElement('promptlet-prompt-card')
export class PromptLetPromptCard extends LitElement {
  //==========================================================================||
  //                              Class Properties                            ||
  //==========================================================================||
  @property({ attribute: false })
  promptData: PromptDataRemote;

  @property({ type: String })
  curSelectedTag = '';

  //==========================================================================||
  //                             Lifecycle Methods                            ||
  //==========================================================================||
  constructor() {
    super();
    this.promptData = getEmptyPromptData();
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {}

  //==========================================================================||
  //                              Custom Methods                              ||
  //==========================================================================||
  async initData() {}

  //==========================================================================||
  //                              Event Handlers                              ||
  //==========================================================================||
  /**
   * Tag clicked event handler
   * @param tag Clicked tag name
   */
  tagClicked(e: MouseEvent, tag: string) {
    e.preventDefault();
    e.stopPropagation();

    // Notify the parent
    const event = new CustomEvent('tag-clicked', {
      detail: tag,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  //==========================================================================||
  //                             Private Helpers                              ||
  //==========================================================================||

  //==========================================================================||
  //                           Templates and Styles                           ||
  //==========================================================================||
  render() {
    // Compose the tag list
    let tagList = html``;
    for (const tag of this.promptData.tags) {
      tagList = html`${tagList}
        <span
          class="tag"
          ?is-selected=${this.curSelectedTag === tag}
          @click=${(e: MouseEvent) => this.tagClicked(e, tag)}
          >${tag}</span
        >`;
    }

    // Compose the share info
    const numFormatter = d3.format(',');
    let dateFormatter = d3.timeFormat('%b %d, %Y');
    const fullTimeFormatter = d3.timeFormat('%b %d, %Y %H:%M');
    const date = d3.isoParse(this.promptData.created)!;
    const curDate = new Date();

    // Ignore the year if it is the same year as today
    if (date.getFullYear == curDate.getFullYear) {
      dateFormatter = d3.timeFormat('%b %d');
    }
    const user =
      this.promptData.userName === '' ? 'Anonymous' : this.promptData.userName;

    return html`
      <div class="prompt-card">
        <div class="header">
          <span class="icon"><span>${this.promptData.icon}</span></span>
          <span class="name-wrapper">
            <span class="name" title=${this.promptData.title}
              >${this.promptData.title}</span
            >
          </span>
        </div>

        <div class="prompt">${this.promptData.prompt}</div>

        <div class="tag-list">${tagList}</div>

        <div class="footer">
          <span class="run-count"
            >${numFormatter(this.promptData.promptRunCount)} runs</span
          >
          <span class="share-info">
            <span class="name" title=${user}>${user}</span>
            <span class="separator"></span>
            <span class="date" title=${fullTimeFormatter(date)}
              >${dateFormatter(date)}</span
            >
          </span>
        </div>
      </div>
    `;
  }

  static styles = [
    css`
      ${unsafeCSS(componentCSS)}
    `
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'promptlet-prompt-card': PromptLetPromptCard;
  }
}

const getEmptyPromptData = () => {
  const data: PromptDataRemote = {
    prompt: '',
    tags: [],
    userID: '',
    userName: '',
    description: '',
    icon: '',
    forkFrom: '',
    promptRunCount: 0,
    created: '',
    title: ''
  };
  return data;
};
