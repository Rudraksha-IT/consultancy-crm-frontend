# Frontend documentation

The rules and decisions this repository follows. Read them before changing the code.

| File                                 | What it is                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [design-system.md](design-system.md) | Tokens, components, phone layout, gestures, keyboard rules and theming. Every screen follows it |
| [adr/](adr/README.md)                | Architecture Decision Records: why each technical choice was made                               |
| [logging.md](logging.md)             | How the Next.js server logs: format, levels, what is never logged                               |

`design-system.md` and the ADRs that concern both apps are kept, identical, in the backend repository too. The glossary (`docs/GLOSSARY.md`) is kept once, in the private workspace repository that holds both code repositories. When you change one copy, change the other.

The product-wide documents (the spec, PRD, FRD, SRS, TRD and the clickable prototype) live with the product docs, outside the code repositories.
