/**
 * Point d'entrée unique vers la base de données.
 *
 * Le JSON est importé tel quel (Vite l'inline dans le bundle) puis typé. La
 * validation Zod n'est pas faite ici mais au build (`npm run validate`) et dans les
 * tests : inutile d'embarquer le coût d'une validation à chaque chargement de page
 * pour des données figées.
 */
import rawMinisters from "../../data/ministers.json";
import type { Minister } from "./types";

export const MINISTERS = rawMinisters as readonly Minister[];
