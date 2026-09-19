import { defineCustomElement } from "vue";
import Treeselect from "./components/Treeselect.vue";
import treeselectMixin from "./mixins/treeselectMixin.js";
import { DEFAULT_TAG_NAME, MODEL_EVENT } from "./constants";

// defineCustomElement() only reads `props`/`emits` declared directly on the
// object passed to it — it doesn't resolve `mixins`. Treeselect.vue declares
// all of its props/emits through treeselectMixin rather than on itself, so
// without repeating them here the custom element ends up with none of them
// wired up as observed attributes/properties (every prop, including
// `options`, silently does nothing).

const { name: _nameProp, ...customElementProps } = treeselectMixin.props;
const webComponentMixin = { ...treeselectMixin, props: customElementProps };

const TreeselectElement = defineCustomElement(
  {
    ...Treeselect,
    mixins: [webComponentMixin],
    props: customElementProps,
    emits: treeselectMixin.emits
  },
  {
    shadowRoot: false
  }
);

function stringifyFormValue(value) {
  if (typeof value === "string") {
    return value;
  }
  if (value != null && !Number.isNaN(value)) {
    return String(value);
  }
  return "";
}

function hasValue(value) {
  return Array.isArray(value) ? value.length > 0 : value != null && value !== "";
}

/**
 * Wraps the Vue-generated custom element to additionally participate in
 * native <form> submission and validity via ElementInternals, since
 * defineCustomElement() alone doesn't know about form association.
 *
 * The inner Treeselect's own `name` prop (and its hidden <input> fallback)
 * is intentionally left unset here: this class submits through
 * ElementInternals.setFormValue() instead, keyed off the custom element's
 * own `name` attribute, to avoid submitting the same value twice.
 */
export class MmTreeSelectElement extends TreeselectElement {
  static formAssociated = true;

  constructor(initialProps) {
    super(initialProps);
    this._internals = this.attachInternals();
    this._onModelValueChange = this._onModelValueChange.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(MODEL_EVENT, this._onModelValueChange);
    this._syncFormState(this.modelValue);
  }

  disconnectedCallback() {
    this.removeEventListener(MODEL_EVENT, this._onModelValueChange);
    super.disconnectedCallback();
  }

  _onModelValueChange(event) {
    // Treeselect owns its selection state internally and only notifies
    // changes via this event; `this.modelValue` isn't kept in sync unless
    // an outer consumer writes it back, so read the emitted value instead.
    const value = event.detail && event.detail[0];
    this._syncFormState(value);
  }

  _syncFormState(value) {
    const name = this.getAttribute("name");

    if (!name) {
      this._internals.setFormValue(null);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        this._internals.setFormValue(null);
      } else {
        const formData = new FormData();
        for (const item of value) {
          formData.append(name, stringifyFormValue(item));
        }
        this._internals.setFormValue(formData);
      }
    } else {
      this._internals.setFormValue(value == null ? null : stringifyFormValue(value));
    }

    if (this.required && !hasValue(value)) {
      this._internals.setValidity(
        { valueMissing: true },
        "Please select a value.",
        this.querySelector("input") || this
      );
    } else {
      this._internals.setValidity({});
    }
  }

  formResetCallback() {
    this.modelValue = this.multiple ? [] : null;
    this._syncFormState(this.modelValue);
  }

  formDisabledCallback(disabled) {
    this.disabled = disabled;
  }

  get form() {
    return this._internals.form;
  }

  get type() {
    return this.localName;
  }

  get validity() {
    return this._internals.validity;
  }

  get validationMessage() {
    return this._internals.validationMessage;
  }

  get willValidate() {
    return this._internals.willValidate;
  }

  checkValidity() {
    return this._internals.checkValidity();
  }

  reportValidity() {
    return this._internals.reportValidity();
  }

  get labels() {
    return this._internals.labels;
  }
}

/**
 * Registers the component under `tagName` (default "mm-tree-select").
 * Safe to call more than once, and useful for picking a different tag
 * name when the default one is already taken in the host page.
 */
export function register(tagName = DEFAULT_TAG_NAME) {
  if (customElements.get(tagName)) {
    console.warn(
      `[vue3-treeselect] Custom element name "${tagName}" is already registered. ` +
        `Call register("your-custom-name") with a different tag name to resolve the conflict.`
    );
    return tagName;
  }

  customElements.define(tagName, MmTreeSelectElement);
  return tagName;
}

register(DEFAULT_TAG_NAME);
