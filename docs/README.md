# Frontend documentation

The rules and decisions this repository follows. Read them before changing the code.

| File                                 | What it is                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [design-system.md](design-system.md) | Tokens, components, phone layout, gestures, keyboard rules and theming. Every screen follows it |
| [adr/](adr/README.md)                | Architecture Decision Records: why each technical choice was made                               |
| [logging.md](logging.md)             | How the Next.js server logs: format, levels, what is never logged                               |
| [GLOSSARY.md](GLOSSARY.md)           | The domain words, used the same in code, API fields, tests and on screen                        |

`GLOSSARY.md`, `design-system.md` and the ADRs that concern both apps are kept, identical, in the backend repository too. When you change one copy, change the other.

The product-wide documents (the spec, PRD, FRD, SRS, TRD and the clickable prototype) live with the product docs, outside the code repositories.
