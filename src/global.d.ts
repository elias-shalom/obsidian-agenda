import type { HandlebarsTemplateDelegate } from 'handlebars';

declare module "*.hbs" {
  const template: HandlebarsTemplateDelegate;
  export default template;
}