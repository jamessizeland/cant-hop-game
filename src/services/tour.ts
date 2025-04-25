import { StepType } from "@reactour/tour";

export const tourSteps: StepType[] = [
  {
    selector: "#board-container",
    content:
      "Welcome to the Pond! Your goal is to help your frogs hop all the way up their lilypad columns, from the murky bottom to the sunny top. Be the first player to reach the final lilypad in three different columns to claim victory and become the Pond Champion!",
  },
  {
    selector: "#turn-start-container",
    content:
      "Ready to make a splash? Roll the dice to see which lilypads your frogs can hop to! Press the 'Hop' button.",
    disableActions: true,
    stepInteraction: true,
  },
  {
    selector: "#dice-container",
    content:
      "You've rolled four dice! Pair them up (two pairs) and add the numbers in each pair. These sums tell you which lilypad columns your frogs might advance on this hop.",
    disableActions: false,
  },
  {
    selector: "#choice-container",
    content:
      "Based on your dice pairs, these are the lilypad columns you can choose to hop on. You can pick up to three different columns during your turn's hopping spree. Choose which columns your frogs will attempt to advance on!",
    disableActions: true,
    stepInteraction: true,
  },
  {
    selector: "#turn-start-container",
    content:
      "Feeling brave, little tadpole? Choose 'Hop' to roll again and try to advance further up your chosen lilypad columns (up to three total for the turn). Or, play it safe and 'Stop' to secure your frogs' current positions on their lilypads. Be warned! If you hop again and can't make *any* of your chosen column numbers with the new dice pairs, your frogs get stuck in the mud - you're CROAKED! - and lose all progress from this turn's hopping spree. Happy Hopping!",
  },
];
