import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { getEmptyPromptDataRemote } from '../panel-community/panel-community';
import { PromptManager } from '../wordflow/prompt-manager';
import { v4 as uuidv4 } from 'uuid';

import '../prompt-card/prompt-card';
import '../pagination/pagination';
import '../prompt-editor/prompt-editor';
import '../confirm-dialog/confirm-dialog';

// Types
import type { PromptDataLocal, PromptDataRemote } from '../../types/promptlet';
import type { PromptLetPromptCard } from '../prompt-card/prompt-card';

// Assets
import componentCSS from './panel-local.css?inline';
import searchIcon from '../../images/icon-search.svg?raw';
import crossIcon from '../../images/icon-cross-thick.svg?raw';
import sortIcon from '../../images/icon-decrease.svg?raw';
import deleteIcon from '../../images/icon-delete.svg?raw';
import editIcon from '../../images/icon-edit-pen.svg?raw';
import addIcon from '../../images/icon-plus-circle.svg?raw';
import fakePromptsJSON from '../../data/fake-prompts-100.json';

// Constants
const fakePrompts = fakePromptsJSON as PromptDataLocal[];

const promptCountIncrement = 20;

/**
 * Panel local element.
 *
 */
@customElement('promptlet-panel-local')
export class PromptLetPanelLocal extends LitElement {
  //==========================================================================||
  //                              Class Properties                            ||
  //==========================================================================||
  @property({ attribute: false })
  promptManager!: PromptManager;

  @property({ attribute: false })
  localPrompts: PromptDataLocal[] = [];

  @property({ attribute: false })
  favPrompts: PromptDataLocal[] = [];

  @property({ attribute: false })
  updateFavPrompts: (newFavPrompts: PromptDataLocal[]) => void = (
    _: PromptDataLocal[]
  ) => {};

  @state()
  allPrompts: PromptDataLocal[] = [];

  @state()
  maxPromptCount = 18;

  @state()
  isDraggingPromptCard = false;

  @state()
  hoveringPromptCardIndex: number | null = null;

  @state()
  selectedPrompt: PromptDataLocal | null = fakePrompts[0];

  @state()
  shouldCreateNewPrompt = false;

  @query('.prompt-content')
  promptContentElement: HTMLElement | undefined;

  @query('.prompt-container')
  promptContainerElement: HTMLElement | undefined;

  @query('.prompt-loader')
  promptLoaderElement: HTMLElement | undefined;

  @query('.prompt-modal')
  promptModalElement: HTMLDialogElement | undefined;

  draggingImageElement: HTMLElement | null = null;

  //==========================================================================||
  //                             Lifecycle Methods                            ||
  //==========================================================================||
  constructor() {
    super();
    this.allPrompts = fakePrompts.slice(0, 33);
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

  promptCardClicked(promptData: PromptDataLocal) {
    if (
      this.promptModalElement === undefined ||
      this.promptContentElement === undefined
    ) {
      throw Error('promptModalElement is undefined.');
    }
    this.shouldCreateNewPrompt = false;
    this.selectedPrompt = promptData;
    this.promptModalElement.style.setProperty(
      'top',
      `${this.promptContentElement.scrollTop}px`
    );
    this.promptModalElement.classList.remove('hidden');
  }

  /**
   * Event handler for scroll event. Load more items when the user scrolls to
   * the bottom.
   */
  async promptContainerScrolled() {
    if (
      this.promptContainerElement === undefined ||
      this.promptLoaderElement === undefined
    ) {
      throw Error('promptContainerElement is undefined');
    }

    const isAtBottom =
      this.promptContainerElement.scrollHeight -
        this.promptContainerElement.scrollTop <=
      this.promptContainerElement.clientHeight + 5;

    if (isAtBottom && this.maxPromptCount < this.allPrompts.length) {
      // Keep track the original scroll position
      const previousScrollTop = this.promptContainerElement.scrollTop;

      // Show the loader for a while
      this.promptLoaderElement.classList.remove('hidden', 'no-display');

      await new Promise<void>(resolve => {
        setTimeout(() => {
          resolve();
        }, 800);
      });
      this.maxPromptCount += promptCountIncrement;
      await this.updateComplete;

      // Hide the loader
      this.promptLoaderElement.classList.add('hidden');

      // Restore the scroll position
      this.promptContainerElement.scrollTop = previousScrollTop;
    }

    if (this.maxPromptCount >= this.allPrompts.length) {
      this.promptLoaderElement.classList.add('no-display');
    }
  }

  /**
   * Event handler for drag starting from the prompt card
   * @param e Drag event
   */
  promptCardDragStarted(e: DragEvent) {
    this.isDraggingPromptCard = true;
    const target = e.target as PromptLetPromptCard;
    target.classList.add('dragging');
    document.body.style.setProperty('cursor', 'grabbing');

    this.hoveringPromptCardIndex = null;

    // Set the current prompt to data transfer
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData(
        'newPromptData',
        JSON.stringify(target.promptData)
      );
    }

    // Mimic the current slot width
    let slotWidth = 200;
    if (this.shadowRoot) {
      const favPrompt = this.shadowRoot.querySelector(
        '.fav-prompt-slot'
      ) as HTMLElement;
      slotWidth = favPrompt.getBoundingClientRect().width;
    }

    // Set the dragging image
    const tempFavSlot = document.createElement('div');
    tempFavSlot.classList.add('fav-prompt-slot');
    tempFavSlot.setAttribute('is-temp', 'true');
    tempFavSlot.style.setProperty('width', `${slotWidth}px`);

    const miniCard = document.createElement('div');
    miniCard.classList.add('prompt-mini-card');

    const icon = document.createElement('span');
    icon.classList.add('icon');
    icon.innerText = target.promptData.icon;

    const title = document.createElement('span');
    title.classList.add('title');
    title.innerText = target.promptData.title;

    miniCard.appendChild(icon);
    miniCard.appendChild(title);
    tempFavSlot.appendChild(miniCard);

    this.promptContainerElement?.append(tempFavSlot);
    this.draggingImageElement = tempFavSlot;
    e.dataTransfer?.setDragImage(tempFavSlot, 10, 10);
  }

  /**
   * Event handler for drag ending from the prompt card
   * @param e Drag event
   */
  promptCardDragEnded(e: DragEvent) {
    this.isDraggingPromptCard = false;
    const target = e.target as PromptLetPromptCard;
    target.classList.remove('dragging');
    document.body.style.removeProperty('cursor');

    // Remove the temporary slot element
    this.draggingImageElement?.remove();
    this.draggingImageElement = null;
  }

  favPromptSlotDragEntered(e: DragEvent) {
    const currentTarget = e.currentTarget as HTMLDivElement;
    currentTarget.classList.add('drag-over');
  }

  favPromptSlotDragLeft(e: DragEvent) {
    const currentTarget = e.currentTarget as HTMLDivElement;
    currentTarget.classList.remove('drag-over');
  }

  /**
   * Copy prompt data to the favorite prompt slot
   * @param e Drag event
   * @param index Index of the current fav prompt slot
   */
  favPromptSlotDropped(e: DragEvent, index: number) {
    if (e.dataTransfer) {
      const newPromptDataString = e.dataTransfer.getData('newPromptData');
      const newPromptData = JSON.parse(newPromptDataString) as PromptDataLocal;
      this.favPrompts[index] = newPromptData;
      const newFavPrompts = structuredClone(this.favPrompts);
      newFavPrompts[index] = newPromptData;
      this.updateFavPrompts(newFavPrompts);
    }

    // Cancel the drag event because dragleave would not be fired after drop
    const currentTarget = e.currentTarget as HTMLDivElement;
    currentTarget.classList.remove('drag-over');
    e.preventDefault();
  }

  promptCardMouseEntered(e: MouseEvent, index: number) {
    e.preventDefault();
    this.hoveringPromptCardIndex = index;
  }

  promptCardMouseLeft(e: MouseEvent) {
    e.preventDefault();
    this.hoveringPromptCardIndex = null;
  }

  modalCloseClickHandler() {
    if (this.promptModalElement === undefined) {
      throw Error('promptModalElement is undefined.');
    }
    this.promptModalElement.classList.add('hidden');
  }

  creteButtonClicked() {
    if (this.promptModalElement === undefined) {
      throw Error('promptModalElement is undefined.');
    }
    this.selectedPrompt = getEmptyPromptDataLocal();
    this.shouldCreateNewPrompt = true;
    this.promptModalElement.classList.remove('hidden');
  }

  sortOptionChanged(e: InputEvent) {
    const selectElement = e.currentTarget as HTMLInputElement;
    const sortOption = selectElement.value;
    if (
      sortOption === 'created' ||
      sortOption === 'name' ||
      sortOption === 'runCount'
    ) {
      this.promptManager.sortPrompts(sortOption);
    }
  }

  //==========================================================================||
  //                             Private Helpers                              ||
  //==========================================================================||

  //==========================================================================||
  //                           Templates and Styles                           ||
  //==========================================================================||
  render() {
    // Compose the prompt cards
    let promptCards = html``;
    for (const [i, promptData] of this.localPrompts
      .slice(0, Math.min(this.maxPromptCount, this.allPrompts.length))
      .entries()) {
      promptCards = html`${promptCards}
        <div
          class="prompt-card-container"
          @mouseenter=${(e: MouseEvent) => {
            this.promptCardMouseEntered(e, i);
          }}
          @mouseleave=${(e: MouseEvent) => {
            this.promptCardMouseLeft(e);
          }}
        >
          <div
            class="prompt-card-menu"
            ?is-hidden="${this.hoveringPromptCardIndex !== i}"
          >
            <button class="edit-button">
              <span class="svg-icon">${unsafeHTML(editIcon)}</span>
            </button>

            <button class="delete-button">
              <span class="svg-icon">${unsafeHTML(deleteIcon)}</span>
            </button>
          </div>

          <promptlet-prompt-card
            draggable="true"
            .promptData=${promptData}
            .isLocalPrompt=${true}
            @click=${() => {
              this.promptCardClicked(promptData);
            }}
            @dragstart=${(e: DragEvent) => {
              this.promptCardDragStarted(e);
            }}
            @dragend=${(e: DragEvent) => {
              this.promptCardDragEnded(e);
            }}
          ></promptlet-prompt-card>
        </div>`;
    }

    // Compose the fav prompts
    let favPrompts = html``;
    for (const [i, favPrompt] of this.favPrompts.entries()) {
      favPrompts = html`${favPrompts}
        <div
          class="fav-prompt-slot"
          @dragenter=${(e: DragEvent) => {
            this.favPromptSlotDragEntered(e);
          }}
          @dragleave=${(e: DragEvent) => {
            this.favPromptSlotDragLeft(e);
          }}
          @dragover=${(e: DragEvent) => {
            e.preventDefault();
          }}
          @drop=${(e: DragEvent) => {
            this.favPromptSlotDropped(e, i);
          }}
        >
          <div class="prompt-mini-card">
            <span class="icon">${favPrompt.icon}</span>
            <span class="title">${favPrompt.title}</span>
          </div>
        </div>`;
    }

    return html`
      <div class="panel-local" ?is-dragging=${this.isDraggingPromptCard}>
        <div class="prompt-panel">
          <div class="search-panel">
            <div class="search-group">
              <div class="result">${this.allPrompts.length} Prompts</div>

              <button
                class="create-button"
                @click=${() => this.creteButtonClicked()}
              >
                <span class="svg-icon">${unsafeHTML(addIcon)}</span>New Prompt
              </button>
            </div>

            <div class="search-group">
              <div class="search-bar">
                <span class="icon-container">
                  <span class="svg-icon">${unsafeHTML(searchIcon)}</span>
                </span>

                <input
                  id="search-bar-input"
                  type="text"
                  name="search-bar-input"
                  placeholder="Search my prompts"
                />

                <span class="icon-container">
                  <span class="svg-icon cross">${unsafeHTML(crossIcon)}</span>
                </span>
              </div>

              <div class="sort-button">
                <span class="svg-icon">${unsafeHTML(sortIcon)}</span>
                <select
                  class="sort-selection"
                  @input=${(e: InputEvent) => this.sortOptionChanged(e)}
                >
                  <option value="created">Recency</option>
                  <option value="name">Name</option>
                  <option value="runCount">Run Count</option>
                </select>
              </div>
            </div>
          </div>

          <div class="prompt-content">
            <div
              class="prompt-container"
              @scroll=${() => {
                this.promptContainerScrolled();
              }}
            >
              ${promptCards}

              <div class="prompt-loader hidden">
                <div class="loader-container">
                  <div class="circle-loader"></div>
                </div>
              </div>
            </div>

            <div class="fav-panel">
              <div class="header">
                <span class="title">Favorite Prompts</span>
                <span class="description"
                  >Drag prompts here to customize the toolbar</span
                >
              </div>

              <div class="fav-prompts">${favPrompts}</div>
            </div>

            <div class="prompt-modal hidden">
              <promptlet-prompt-editor
                .promptData=${this.selectedPrompt
                  ? this.selectedPrompt
                  : getEmptyPromptDataLocal()}
                .isNewPrompt=${this.shouldCreateNewPrompt}
                .promptManager=${this.promptManager}
                @close-clicked=${() => this.modalCloseClickHandler()}
              ></promptlet-prompt-editor>
            </div>
          </div>
        </div>

        <nightjar-confirm-dialog></nightjar-confirm-dialog>
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
    'promptlet-panel-local': PromptLetPanelLocal;
  }
}

export const getEmptyPromptDataLocal = () => {
  const dataRemote = getEmptyPromptDataRemote();
  const dataLocal: PromptDataLocal = { ...dataRemote, key: uuidv4() };
  return dataLocal;
};
