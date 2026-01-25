# =============================================================================
# EXPERIMENT 3: PATTERN MEMORY CHALLENGE - DATA ANALYSIS SCRIPT
# =============================================================================
#
# Description:
#   Complete analysis script for Experiment 3 (pattern memory and expectation)
#   This experiment provides the cleanest test of Capaldi's Sequential Theory
#
# Design: Between-Subjects (2 conditions)
#   - N→R PATTERN: Alternating BLANK→ACE→BLANK→ACE sequence
#   - RANDOM: Shuffled sequence (same totals)
#
# Primary DVs:
#   1. Expectation rating (1-7): "After BLANK, what comes next?"
#   2. Betting behavior: % bet ACE after seeing BLANK
#
# Theoretical Predictions:
#   CAPALDI: N→R > RANDOM on both DVs
#   - N→R should expect ACE (rating ~6)
#   - RANDOM should be uncertain (rating ~4)
#
# Author: Research Games Project
# Date: January 2025
# =============================================================================

# =============================================================================
# SETUP
# =============================================================================

library(tidyverse)
library(effsize)
library(BayesFactor)
library(mediation)
library(pwr)
library(ggplot2)
library(patchwork)

set.seed(42)

# =============================================================================
# DATA LOADING
# =============================================================================

#' Load Experiment 3 data from JSON files
#'
#' @param data_dir Directory containing JSON files
#' @return Dataframe with one row per participant
load_pattern_memory_data <- function(data_dir = "data/") {

  json_files <- list.files(data_dir, pattern = "pattern_memory_.*\\.json$",
                           full.names = TRUE)

  cat(sprintf("Found %d data files\n", length(json_files)))

  data_list <- lapply(json_files, function(f) {
    tryCatch({
      jsonlite::fromJSON(f)
    }, error = function(e) {
      warning(paste("Error reading:", f))
      NULL
    })
  })

  data_list <- data_list[!sapply(data_list, is.null)]

  # Extract to dataframe
  df <- data.frame(
    participant_id = sapply(data_list, function(x) x$participant_id),
    condition = sapply(data_list, function(x) x$condition),

    # PRIMARY DV 1: Expectation rating
    expectation = sapply(data_list, function(x) x$expectation$rating %||% NA),

    # PRIMARY DV 2: Betting behavior
    pct_bet_ace_after_blank = sapply(data_list, function(x)
      x$betting$summary$pct_bet_ace_after_blank %||% NA),

    # Memory test
    recognition_correct = sapply(data_list, function(x)
      x$memory_test$recognition_correct %||% NA),
    pattern_detected = sapply(data_list, function(x)
      x$memory_test$pattern_detected %||% NA),

    # Mechanism measures
    predictability = sapply(data_list, function(x)
      x$mechanism$predictability %||% NA),
    expect_after_blank = sapply(data_list, function(x)
      x$mechanism$expect_after_blank %||% NA),
    task_difficult = sapply(data_list, function(x)
      x$mechanism$task_difficult %||% NA),
    frustrating = sapply(data_list, function(x)
      x$mechanism$frustrating %||% NA),

    # Working memory
    wm_score = sapply(data_list, function(x)
      x$working_memory$score %||% NA),

    # Attention checks
    n_cards_correct = sapply(data_list, function(x)
      x$attention_checks$n_cards_correct %||% NA),
    card_types_correct = sapply(data_list, function(x)
      x$attention_checks$card_types_correct %||% NA),
    betting_correct = sapply(data_list, function(x)
      x$attention_checks$betting_correct %||% NA),

    stringsAsFactors = FALSE
  )

  # Set condition as factor
  df$condition <- factor(df$condition, levels = c("RANDOM", "NR_PATTERN"))

  return(df)
}

#' Apply preregistered exclusion criteria
#'
#' @param df Raw dataframe
#' @return Cleaned dataframe
apply_exclusions <- function(df) {

  cat("=== APPLYING EXCLUSION CRITERIA ===\n\n")

  n_original <- nrow(df)

  # Exclusion 1: Failed attention checks
  df_clean <- df %>%
    filter(
      n_cards_correct == TRUE | is.na(n_cards_correct),
      card_types_correct == TRUE | is.na(card_types_correct),
      betting_correct == TRUE | is.na(betting_correct)
    )

  n_after_attention <- nrow(df_clean)
  cat(sprintf("Failed attention checks: %d\n", n_original - n_after_attention))

  # Exclusion 2: Missing primary DV
  df_clean <- df_clean %>%
    filter(!is.na(expectation))

  n_final <- nrow(df_clean)
  cat(sprintf("Missing expectation: %d\n", n_after_attention - n_final))

  cat(sprintf("\nOriginal N: %d\n", n_original))
  cat(sprintf("Final N: %d\n", n_final))
  cat(sprintf("Total excluded: %d (%.1f%%)\n\n",
              n_original - n_final,
              100 * (n_original - n_final) / n_original))

  # N per condition
  cat("N per condition:\n")
  print(table(df_clean$condition))
  cat("\n")

  return(df_clean)
}

# =============================================================================
# DESCRIPTIVE STATISTICS
# =============================================================================

#' Calculate descriptive statistics
#'
#' @param df Cleaned dataframe
descriptive_stats <- function(df) {

  cat("=== DESCRIPTIVE STATISTICS ===\n\n")

  # Primary DVs by condition
  summary_df <- df %>%
    group_by(condition) %>%
    summarise(
      n = n(),

      # Expectation
      mean_expect = mean(expectation, na.rm = TRUE),
      sd_expect = sd(expectation, na.rm = TRUE),
      se_expect = sd_expect / sqrt(n),

      # Betting
      mean_bet_ace = mean(pct_bet_ace_after_blank, na.rm = TRUE),
      sd_bet_ace = sd(pct_bet_ace_after_blank, na.rm = TRUE),

      # Pattern detection
      pct_detected = mean(pattern_detected, na.rm = TRUE) * 100,

      # Frustration (Festinger check)
      mean_frustration = mean(frustrating, na.rm = TRUE),

      .groups = "drop"
    )

  cat("PRIMARY DVs BY CONDITION:\n")
  print(summary_df)
  cat("\n")

  return(summary_df)
}

# =============================================================================
# PRIMARY ANALYSIS: EXPECTATION RATING
# =============================================================================

#' Test primary hypothesis: Expectation difference
#'
#' @param df Cleaned dataframe
run_expectation_test <- function(df) {

  cat("=== PRIMARY ANALYSIS: EXPECTATION RATING ===\n\n")

  # Independent samples t-test
  t_result <- t.test(expectation ~ condition, data = df)

  cat("Independent Samples t-test:\n")
  print(t_result)
  cat("\n")

  # Effect size
  d_result <- cohen.d(expectation ~ condition, data = df)
  cat(sprintf("Cohen's d: %.3f [%.3f, %.3f]\n",
              d_result$estimate,
              d_result$conf.int[1],
              d_result$conf.int[2]))
  cat(sprintf("Interpretation: %s effect\n\n", d_result$magnitude))

  # Group means
  means <- df %>%
    group_by(condition) %>%
    summarise(
      mean = mean(expectation, na.rm = TRUE),
      sd = sd(expectation, na.rm = TRUE),
      .groups = "drop"
    )

  cat("Group Means:\n")
  print(means)
  cat("\n")

  # Compare to chance (4 = midpoint)
  cat("One-sample t-tests vs. chance (4.0):\n")

  nr_data <- df %>% filter(condition == "NR_PATTERN") %>% pull(expectation)
  random_data <- df %>% filter(condition == "RANDOM") %>% pull(expectation)

  nr_vs_chance <- t.test(nr_data, mu = 4)
  random_vs_chance <- t.test(random_data, mu = 4)

  cat(sprintf("N→R vs. chance: t = %.2f, p = %.4f\n",
              nr_vs_chance$statistic, nr_vs_chance$p.value))
  cat(sprintf("RANDOM vs. chance: t = %.2f, p = %.4f\n\n",
              random_vs_chance$statistic, random_vs_chance$p.value))

  return(list(
    t_test = t_result,
    effect_size = d_result,
    means = means
  ))
}

# =============================================================================
# SECONDARY ANALYSIS: BETTING BEHAVIOR
# =============================================================================

#' Test behavioral measure: Betting on ACE after BLANK
#'
#' @param df Cleaned dataframe
run_betting_test <- function(df) {

  cat("=== SECONDARY ANALYSIS: BETTING BEHAVIOR ===\n\n")

  # Filter to participants with betting data
  df_bet <- df %>% filter(!is.na(pct_bet_ace_after_blank))

  if (nrow(df_bet) < 10) {
    cat("Insufficient betting data.\n\n")
    return(NULL)
  }

  # t-test
  t_result <- t.test(pct_bet_ace_after_blank ~ condition, data = df_bet)

  cat("t-test: % Bet ACE after BLANK\n")
  print(t_result)
  cat("\n")

  # Effect size
  d_result <- cohen.d(pct_bet_ace_after_blank ~ condition, data = df_bet)
  cat(sprintf("Cohen's d: %.3f\n\n", d_result$estimate))

  # Compare to chance (50%)
  cat("One-sample t-tests vs. chance (50%):\n")

  nr_bet <- df_bet %>% filter(condition == "NR_PATTERN") %>% pull(pct_bet_ace_after_blank)
  random_bet <- df_bet %>% filter(condition == "RANDOM") %>% pull(pct_bet_ace_after_blank)

  if (length(nr_bet) > 2) {
    nr_vs_chance <- t.test(nr_bet, mu = 50)
    cat(sprintf("N→R vs. 50%%: mean = %.1f%%, t = %.2f, p = %.4f\n",
                mean(nr_bet), nr_vs_chance$statistic, nr_vs_chance$p.value))
  }

  if (length(random_bet) > 2) {
    random_vs_chance <- t.test(random_bet, mu = 50)
    cat(sprintf("RANDOM vs. 50%%: mean = %.1f%%, t = %.2f, p = %.4f\n\n",
                mean(random_bet), random_vs_chance$statistic, random_vs_chance$p.value))
  }

  return(list(t_test = t_result, effect_size = d_result))
}

# =============================================================================
# PATTERN DETECTION
# =============================================================================

#' Analyze pattern detection rates
#'
#' @param df Cleaned dataframe
run_pattern_detection_test <- function(df) {

  cat("=== PATTERN DETECTION ===\n\n")

  # Contingency table
  detection_table <- table(df$condition, df$pattern_detected)
  cat("Detection by Condition:\n")
  print(detection_table)
  cat("\n")

  # Chi-squared test
  chi_result <- chisq.test(detection_table)
  cat("Chi-squared test:\n")
  print(chi_result)
  cat("\n")

  # Proportions
  props <- df %>%
    group_by(condition) %>%
    summarise(
      n_detected = sum(pattern_detected, na.rm = TRUE),
      n_total = sum(!is.na(pattern_detected)),
      pct_detected = n_detected / n_total * 100,
      .groups = "drop"
    )

  cat("Detection Proportions:\n")
  print(props)
  cat("\n")

  return(list(table = detection_table, chi = chi_result, proportions = props))
}

# =============================================================================
# FESTINGER CHECK: FRUSTRATION EQUIVALENCE
# =============================================================================

#' Test that frustration doesn't differ between conditions
#'
#' Rules out Festinger's effort/frustration as alternative explanation
#'
#' @param df Cleaned dataframe
run_frustration_test <- function(df) {

  cat("=== FESTINGER CHECK: FRUSTRATION EQUIVALENCE ===\n\n")

  if (!("frustrating" %in% names(df)) || all(is.na(df$frustrating))) {
    cat("Frustration variable not found.\n\n")
    return(NULL)
  }

  # t-test (should be non-significant)
  t_result <- t.test(frustrating ~ condition, data = df)

  cat("t-test: Frustration by Condition\n")
  print(t_result)
  cat("\n")

  # Means
  means <- df %>%
    group_by(condition) %>%
    summarise(
      mean_frustration = mean(frustrating, na.rm = TRUE),
      sd_frustration = sd(frustrating, na.rm = TRUE),
      .groups = "drop"
    )

  cat("Frustration Means:\n")
  print(means)
  cat("\n")

  if (t_result$p.value > 0.10) {
    cat("CONCLUSION: No difference in frustration between conditions.\n")
    cat("This rules out effort/frustration as alternative explanation.\n")
    cat("Supports Capaldi: Effect is due to sequence learning, not effort.\n\n")
  } else {
    cat("WARNING: Frustration differs between conditions.\n")
    cat("Need to control for this in analysis.\n\n")
  }

  return(list(t_test = t_result, means = means))
}

# =============================================================================
# MEDIATION ANALYSIS
# =============================================================================

#' Test Capaldi's mediation mechanism
#'
#' Condition → Pattern Detection → Expectation
#'
#' @param df Cleaned dataframe
run_mediation <- function(df) {

  cat("=== MEDIATION ANALYSIS ===\n\n")

  # Create numeric condition variable
  df <- df %>%
    mutate(condition_nr = as.numeric(condition == "NR_PATTERN"))

  # Check if we have pattern detection
  if (!("pattern_detected" %in% names(df)) || all(is.na(df$pattern_detected))) {
    cat("Pattern detection variable not found.\n\n")
    return(NULL)
  }

  # Step 1: Condition → Pattern Detection (a path)
  model_a <- lm(pattern_detected ~ condition_nr, data = df)
  cat("Path a (Condition → Pattern Detection):\n")
  print(summary(model_a)$coefficients)
  cat("\n")

  # Step 2: Pattern Detection → Expectation controlling for Condition (b path)
  model_b <- lm(expectation ~ condition_nr + pattern_detected, data = df)
  cat("Path b (Pattern Detection → Expectation | Condition):\n")
  print(summary(model_b)$coefficients)
  cat("\n")

  # Step 3: Direct effect of Condition on Expectation (c' path)
  cat("Direct effect (c'):\n")
  cat(sprintf("  Condition → Expectation: b = %.3f, p = %.4f\n\n",
              coef(model_b)["condition_nr"],
              summary(model_b)$coefficients["condition_nr", "Pr(>|t|)"]))

  # Mediation test using mediation package
  med_result <- tryCatch({
    mediate(model_a, model_b,
            treat = "condition_nr",
            mediator = "pattern_detected",
            boot = TRUE,
            sims = 1000)
  }, error = function(e) {
    cat("Mediation bootstrap failed:", e$message, "\n")
    NULL
  })

  if (!is.null(med_result)) {
    cat("Mediation Results (Bootstrap):\n")
    print(summary(med_result))
  }

  return(list(
    path_a = model_a,
    path_b = model_b,
    mediation = med_result
  ))
}

# =============================================================================
# WORKING MEMORY MODERATION
# =============================================================================

#' Test whether working memory moderates the pattern effect
#'
#' @param df Cleaned dataframe
run_wm_moderation <- function(df) {

  cat("=== WORKING MEMORY MODERATION ===\n\n")

  if (!("wm_score" %in% names(df)) || all(is.na(df$wm_score))) {
    cat("Working memory scores not found.\n\n")
    return(NULL)
  }

  # Median split
  df <- df %>%
    mutate(wm_group = ifelse(wm_score >= median(wm_score, na.rm = TRUE),
                             "High WM", "Low WM"))

  # 2x2 ANOVA: Condition × WM
  model <- aov(expectation ~ condition * wm_group, data = df)

  cat("ANOVA: Condition × Working Memory\n")
  print(summary(model))
  cat("\n")

  # Interaction plot data
  interaction_means <- df %>%
    group_by(condition, wm_group) %>%
    summarise(
      mean = mean(expectation, na.rm = TRUE),
      se = sd(expectation, na.rm = TRUE) / sqrt(n()),
      .groups = "drop"
    )

  cat("Interaction Means:\n")
  print(interaction_means)
  cat("\n")

  # Test simple effects if interaction significant
  f_value <- summary(model)[[1]]["condition:wm_group", "F value"]
  p_value <- summary(model)[[1]]["condition:wm_group", "Pr(>F)"]

  if (!is.na(p_value) && p_value < 0.10) {
    cat("Simple effects (condition effect within each WM group):\n")

    for (wm in c("Low WM", "High WM")) {
      df_sub <- df %>% filter(wm_group == wm)
      t_sub <- t.test(expectation ~ condition, data = df_sub)
      cat(sprintf("  %s: t = %.2f, p = %.4f\n", wm, t_sub$statistic, t_sub$p.value))
    }
    cat("\n")
  }

  return(model)
}

# =============================================================================
# BAYESIAN ANALYSIS
# =============================================================================

#' Bayesian t-test for primary DV
#'
#' @param df Cleaned dataframe
run_bayesian_analysis <- function(df) {

  cat("=== BAYESIAN ANALYSIS ===\n\n")

  nr_data <- df %>% filter(condition == "NR_PATTERN") %>% pull(expectation)
  random_data <- df %>% filter(condition == "RANDOM") %>% pull(expectation)

  bf <- ttestBF(nr_data, random_data, paired = FALSE)

  cat("Bayes Factor (N→R vs RANDOM):\n")
  cat(sprintf("  BF10 (evidence for H1): %.2f\n", exp(bf@bayesFactor$bf)))
  cat(sprintf("  BF01 (evidence for H0): %.2f\n\n", 1/exp(bf@bayesFactor$bf)))

  bf10 <- exp(bf@bayesFactor$bf)

  cat("Interpretation: ")
  if (bf10 > 100) {
    cat("Extreme evidence for effect\n")
  } else if (bf10 > 30) {
    cat("Very strong evidence for effect\n")
  } else if (bf10 > 10) {
    cat("Strong evidence for effect\n")
  } else if (bf10 > 3) {
    cat("Moderate evidence for effect\n")
  } else if (bf10 > 1) {
    cat("Weak evidence for effect\n")
  } else {
    cat("Evidence favors null\n")
  }
  cat("\n")

  return(bf)
}

# =============================================================================
# VISUALIZATIONS
# =============================================================================

#' Create primary results plot
#'
#' @param df Cleaned dataframe
plot_expectation <- function(df) {

  summary_df <- df %>%
    group_by(condition) %>%
    summarise(
      mean = mean(expectation, na.rm = TRUE),
      se = sd(expectation, na.rm = TRUE) / sqrt(n()),
      .groups = "drop"
    )

  condition_labels <- c(
    "RANDOM" = "Random\nSequence",
    "NR_PATTERN" = "N→R Pattern\n(Alternating)"
  )

  p <- ggplot(df, aes(x = condition, y = expectation, fill = condition)) +
    geom_violin(alpha = 0.3) +
    geom_jitter(width = 0.15, alpha = 0.4, size = 2) +
    stat_summary(fun = mean, geom = "point", size = 5, shape = 18, color = "black") +
    stat_summary(fun.data = mean_cl_normal, geom = "errorbar",
                 width = 0.2, size = 1.2, color = "black") +
    geom_hline(yintercept = 4, linetype = "dashed", color = "gray50") +
    annotate("text", x = 1.5, y = 4.3, label = "No expectation (chance)",
             color = "gray50", size = 3.5) +
    scale_x_discrete(labels = condition_labels) +
    scale_fill_manual(values = c("RANDOM" = "#e74c3c", "NR_PATTERN" = "#3498db")) +
    labs(
      title = "Experiment 3: After Seeing BLANK, What Comes Next?",
      subtitle = "Primary DV: Expectation rating (1 = BLANK, 7 = ACE)",
      y = "Expectation Rating",
      x = NULL,
      caption = "Dashed line = no expectation; Error bars = 95% CI"
    ) +
    coord_cartesian(ylim = c(0.5, 7.5)) +
    theme_minimal(base_size = 14) +
    theme(
      legend.position = "none",
      plot.title = element_text(face = "bold"),
      panel.grid.major.x = element_blank()
    )

  return(p)
}

#' Create betting behavior plot
#'
#' @param df Cleaned dataframe
plot_betting <- function(df) {

  df_bet <- df %>% filter(!is.na(pct_bet_ace_after_blank))

  summary_df <- df_bet %>%
    group_by(condition) %>%
    summarise(
      mean = mean(pct_bet_ace_after_blank, na.rm = TRUE),
      se = sd(pct_bet_ace_after_blank, na.rm = TRUE) / sqrt(n()),
      .groups = "drop"
    )

  condition_labels <- c(
    "RANDOM" = "Random",
    "NR_PATTERN" = "N→R Pattern"
  )

  p <- ggplot(summary_df, aes(x = condition, y = mean, fill = condition)) +
    geom_col(width = 0.6, color = "black") +
    geom_errorbar(aes(ymin = mean - se, ymax = mean + se),
                  width = 0.2, size = 0.8) +
    geom_hline(yintercept = 50, linetype = "dashed", color = "red") +
    annotate("text", x = 1.5, y = 53, label = "Chance (50%)",
             color = "red", size = 3.5) +
    scale_x_discrete(labels = condition_labels) +
    scale_fill_manual(values = c("RANDOM" = "#e74c3c", "NR_PATTERN" = "#3498db")) +
    labs(
      title = "Betting Behavior: Did They Act on Expectations?",
      subtitle = "% of times betting on ACE after seeing BLANK",
      y = "% Bet on ACE",
      x = NULL
    ) +
    coord_cartesian(ylim = c(0, 100)) +
    theme_minimal(base_size = 14) +
    theme(
      legend.position = "none",
      plot.title = element_text(face = "bold"),
      panel.grid.major.x = element_blank()
    )

  return(p)
}

#' Create mediation diagram
#'
#' @param med_result Mediation analysis results
plot_mediation_diagram <- function(med_result) {

  # This would create a path diagram

# For now, return text summary
  cat("Mediation path diagram would be rendered here.\n")
  cat("Key paths:\n")
  cat("  Condition → Pattern Detection (a path)\n")
  cat("  Pattern Detection → Expectation (b path)\n")
  cat("  Condition → Expectation (c' direct path)\n")
}

# =============================================================================
# FULL ANALYSIS PIPELINE
# =============================================================================

#' Run complete analysis for Experiment 3
#'
#' @param data_dir Directory with data files
#' @param output_dir Directory for outputs
run_full_analysis <- function(data_dir = "data/", output_dir = "output/") {

  cat("====================================================================\n")
  cat("EXPERIMENT 3: PATTERN MEMORY CHALLENGE - FULL ANALYSIS\n")
  cat("====================================================================\n\n")

  # Create output directory
  if (!dir.exists(output_dir)) {
    dir.create(output_dir, recursive = TRUE)
  }

  # Load data
  df <- load_pattern_memory_data(data_dir)

  # Apply exclusions
  df_clean <- apply_exclusions(df)

  # Descriptives
  desc <- descriptive_stats(df_clean)

  # Primary analysis: Expectation
  expect_result <- run_expectation_test(df_clean)

  # Secondary analysis: Betting
  bet_result <- run_betting_test(df_clean)

  # Pattern detection
  pattern_result <- run_pattern_detection_test(df_clean)

  # Festinger check
  frust_result <- run_frustration_test(df_clean)

  # Mediation
  med_result <- run_mediation(df_clean)

  # Working memory moderation
  wm_result <- run_wm_moderation(df_clean)

  # Bayesian analysis
  bf_result <- run_bayesian_analysis(df_clean)

  # Visualizations
  cat("Creating visualizations...\n")

  p1 <- plot_expectation(df_clean)
  p2 <- plot_betting(df_clean)

  combined <- p1 / p2

  # Save plots
  ggsave(file.path(output_dir, "exp3_expectation.png"), p1,
         width = 8, height = 6, dpi = 300)
  ggsave(file.path(output_dir, "exp3_betting.png"), p2,
         width = 8, height = 6, dpi = 300)
  ggsave(file.path(output_dir, "exp3_combined.png"), combined,
         width = 10, height = 12, dpi = 300)

  cat("\n")
  cat("====================================================================\n")
  cat("ANALYSIS COMPLETE\n")
  cat("====================================================================\n")

  return(list(
    data = df_clean,
    descriptives = desc,
    expectation = expect_result,
    betting = bet_result,
    pattern = pattern_result,
    frustration = frust_result,
    mediation = med_result,
    wm_moderation = wm_result,
    bayes = bf_result
  ))
}

# =============================================================================
# SIMULATED DATA FOR TESTING
# =============================================================================

#' Generate simulated data
#'
#' @param n_per_condition N per condition
generate_simulated_data <- function(n_per_condition = 120) {

  cat("Generating simulated data...\n\n")

  set.seed(42)

  df <- data.frame(
    participant_id = 1:(2 * n_per_condition),
    condition = factor(rep(c("RANDOM", "NR_PATTERN"), each = n_per_condition)),

    # PRIMARY DV: Expectation (Capaldi predicts large effect)
    # RANDOM: Mean ~4 (neutral)
    # NR: Mean ~6 (expect ACE)
    expectation = c(
      round(pmax(1, pmin(7, rnorm(n_per_condition, 4.0, 1.2)))),  # RANDOM
      round(pmax(1, pmin(7, rnorm(n_per_condition, 5.8, 1.0))))   # NR
    ),

    # Betting: % bet ACE after BLANK
    pct_bet_ace_after_blank = c(
      pmax(0, pmin(100, rnorm(n_per_condition, 48, 15))),  # RANDOM ~50%
      pmax(0, pmin(100, rnorm(n_per_condition, 72, 12)))   # NR ~72%
    ),

    # Pattern detection
    pattern_detected = c(
      rbinom(n_per_condition, 1, 0.12),  # RANDOM: 12% false positive
      rbinom(n_per_condition, 1, 0.78)   # NR: 78% detect
    ),

    # Frustration (should NOT differ - rules out Festinger)
    frustrating = c(
      round(pmax(1, pmin(7, rnorm(n_per_condition, 4.2, 1.3)))),
      round(pmax(1, pmin(7, rnorm(n_per_condition, 4.3, 1.4))))
    ),

    # Working memory
    wm_score = round(pmax(0, pmin(5, rnorm(2 * n_per_condition, 3.5, 1.2)))),

    # Attention checks (mostly pass)
    n_cards_correct = TRUE,
    card_types_correct = TRUE,
    betting_correct = TRUE
  )

  return(df)
}

# =============================================================================
# MAIN
# =============================================================================

if (interactive()) {
  cat("To run the full analysis, use:\n")
  cat("  results <- run_full_analysis('path/to/data/')\n\n")
  cat("To test with simulated data:\n")
  cat("  df <- generate_simulated_data()\n")
  cat("  descriptive_stats(df)\n")
  cat("  run_expectation_test(df)\n")
}
