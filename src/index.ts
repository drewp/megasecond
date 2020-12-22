import { customElement, html, LitElement } from "lit-element";

@customElement("game-page")
export class GamePage extends LitElement {
  render() {
    return html` <div id="game">game goes here</div> `;
  }
}
