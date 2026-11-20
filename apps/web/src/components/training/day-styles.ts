/**
 * The day view's stylesheets, imported in exactly one place. Every day surface (day player, Self-Guided
 * day, skeletons, saves, average day, session player) imports this module instead of the .css files, so
 * Turbopack emits day.css and its Summit layer once per page instead of once per importing chunk.
 */
import "./day.css";
import "./day-summit.css";
