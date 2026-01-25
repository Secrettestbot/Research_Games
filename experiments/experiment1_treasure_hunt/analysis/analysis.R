# =============================================================================
# EXPERIMENT 1: DIGITAL TREASURE HUNT - DATA ANALYSIS SCRIPT
# =============================================================================
#
# Description:
#   Complete analysis script for Experiment 1 (Treasure Hunt behavioral task)
#   comparing Festinger's Cognitive Dissonance Theory vs Capaldi's Sequential Theory
#
# Primary DV:
#   Number of chests opened in extinction phase (0-30)
#
# Conditions:
#   1. BASELINE: Random sequence, 3 clicks per chest (control)
#   2. HIGH_EFFORT: Random sequence, 10 clicks for coins (Festinger test)
#   3. NR_PATTERN: Alternating N→R sequence (Capaldi test)
#   4. RN_PATTERN: Alternating R→N sequence (Capaldi control)
#
# Theoretical Predictions:
#   FESTINGER: HIGH_EFFORT > BASELINE = NR = RN (effort creates value)
#   CAPALDI: NR > BASELINE > RN, HIGH_EFFORT = BASELINE (sequence creates expectation)
#
# Author: Research Games Project
# Date: January 2025
# =============================================================================

# =============================================================================
# SETUP AND LIBRARIES
# =============================================================================

# Install packages if needed (uncomment if first time)
# install.packages(c("tidyverse", "afex", "emmeans", "effsize", "TOSTER",
#                    "lavaan", "BayesFactor", "ggplot2", "patchwork"))

# Load required libraries
library(tidyverse)    # Data manipulation and visualization
library(afex)         # ANOVA with effect sizes
library(emmeans)      # Estimated marginal means and contrasts
library(effsize)      # Effect size calculations
library(TOSTER)       # Equivalence testing
library(lavaan)       # Structural equation modeling (mediation)
library(BayesFactor)  # Bayesian analysis for null effects
library(patchwork)    # Combining plots

# Set seed for reproducibility
set.seed(42)

# =============================================================================
# DATA LOADING AND PREPROCESSING
# =============================================================================

#' Load and preprocess experiment data
#'
#' @param data_dir Path to directory containing participant JSON files
#' @return Cleaned and merged dataframe
load_treasure_hunt_data <- function(data_dir = "data/") {

  # Find all JSON files
  json_files <- list.files(data_dir, pattern = "treasure_hunt_.*\\.json$",
                           full.names = TRUE)

  # Read and combine all files
  data_list <- lapply(json_files, function(f) {
    tryCatch({
      jsonlite::fromJSON(f)
    }, error = function(e) {
      warning(paste("Error reading:", f))
      NULL
    })
  })

  # Remove NULL entries
  data_list <- data_list[!sapply(data_list, is.null)]

  # Extract key variables into dataframe
  df <- data.frame(
    participant_id = sapply(data_list, function(x) x$participant_id),
    condition = sapply(data_list, function(x) x$condition),
    extinction_chests = sapply(data_list, function(x) x$extinction_chests_opened),
    extinction_quit = sapply(data_list, function(x) x$extinction_quit_pressed),
    total_coins = sapply(data_list, function(x) x$total_coins),
    stringsAsFactors = FALSE
  )

  # Set condition as factor with meaningful order
  df$condition <- factor(df$condition,
                         levels = c("BASELINE", "HIGH_EFFORT", "NR_PATTERN", "RN_PATTERN"))

  return(df)
}

#' Apply preregistered exclusion criteria
#'
#' @param df Raw dataframe
#' @return Dataframe with exclusions applied and exclusion summary
apply_exclusions <- function(df) {

  cat("=== APPLYING PREREGISTERED EXCLUSION CRITERIA ===\n\n")

  n_original <- nrow(df)
  exclusion_log <- list()

  # Exclusion 1: Failed attention check (if available in survey data)
  # Note: Would need survey responses merged in
  # df <- df %>% filter(attention_check_correct == TRUE)
  # exclusion_log$attention <- n_original - nrow(df)

  # Exclusion 2: Incomplete acquisition phase (<15 of 20 trials)
  # Note: Would need trial-level data
  # df <- df %>% filter(acquisition_completed >= 15)

  # Exclusion 3: Invalid completion time (too fast or too slow)
  # df <- df %>% filter(duration_minutes >= 5 & duration_minutes <= 30)

  # Exclusion 4: Straight-lining in survey
  # Note: Would need survey responses

  # For now, just remove any NAs in key variables
  df <- df %>% filter(!is.na(extinction_chests) & !is.na(condition))

  n_final <- nrow(df)

  cat(sprintf("Original N: %d\n", n_original))
  cat(sprintf("Final N: %d\n", n_final))
  cat(sprintf("Excluded: %d (%.1f%%)\n\n",
              n_original - n_final,
              100 * (n_original - n_final) / n_original))

  # Check N per condition
  cat("N per condition:\n")
  print(table(df$condition))
  cat("\n")

  return(df)
}

# =============================================================================
# DESCRIPTIVE STATISTICS
# =============================================================================

#' Calculate descriptive statistics by condition
#'
#' @param df Cleaned dataframe
#' @return Summary dataframe
descriptive_stats <- function(df) {

  cat("=== DESCRIPTIVE STATISTICS ===\n\n")

  summary_df <- df %>%
    group_by(condition) %>%
    summarise(
      n = n(),
      mean = mean(extinction_chests),
      sd = sd(extinction_chests),
      se = sd(extinction_chests) / sqrt(n()),
      median = median(extinction_chests),
      min = min(extinction_chests),
      max = max(extinction_chests),
      pct_max = mean(extinction_chests == 30) * 100,  # Ceiling effect check
      .groups = "drop"
    )

  print(summary_df)
  cat("\n")

  return(summary_df)
}

# =============================================================================
# PRIMARY ANALYSIS: ONE-WAY ANOVA
# =============================================================================

#' Run primary one-way ANOVA
#'
#' Tests overall effect of condition on extinction persistence
#'
#' @param df Cleaned dataframe
#' @return ANOVA model object
run_primary_anova <- function(df) {

  cat("=== PRIMARY ANALYSIS: ONE-WAY ANOVA ===\n\n")

  # Run ANOVA using afex for effect sizes
  model <- aov_ez(
    id = "participant_id",
    dv = "extinction_chests",
    data = df,
    between = "condition",
    anova_table = list(es = "pes")  # Partial eta-squared
  )

  cat("ANOVA Results:\n")
  print(summary(model))
  cat("\n")

  # Report effect size interpretation
  pes <- summary(model)$univariate.tests["condition", "pes"]
  cat(sprintf("Partial eta-squared: %.3f\n", pes))
  cat("Interpretation: ")
  if (pes < 0.01) {
    cat("negligible effect\n")
  } else if (pes < 0.06) {
    cat("small effect\n")
  } else if (pes < 0.14) {
    cat("medium effect\n")
  } else {
    cat("large effect\n")
  }
  cat("\n")

  return(model)
}

# =============================================================================
# PLANNED CONTRASTS (PREREGISTERED)
# =============================================================================

#' Run preregistered planned contrasts
#'
#' Critical tests comparing Festinger vs Capaldi predictions
#'
#' @param model ANOVA model
#' @param df Cleaned dataframe
#' @return Contrast results
run_planned_contrasts <- function(model, df) {

  cat("=== PLANNED CONTRASTS (PREREGISTERED) ===\n\n")

  # Get estimated marginal means
  emm <- emmeans(model, ~ condition)

  cat("Estimated Marginal Means:\n")
  print(summary(emm))
  cat("\n")

  # Define contrasts based on theoretical predictions
  # Order: BASELINE, HIGH_EFFORT, NR_PATTERN, RN_PATTERN

  contrast_list <- list(
    # Test 1: Effort Effect (Festinger's key prediction)
    # FESTINGER predicts: HIGH_EFFORT > BASELINE
    # CAPALDI predicts: HIGH_EFFORT = BASELINE
    "Effort: HIGH_EFFORT vs BASELINE" = c(-1, 1, 0, 0),

    # Test 2: N→R Pattern Effect (Capaldi's key prediction)
    # FESTINGER predicts: NR = BASELINE
    # CAPALDI predicts: NR > BASELINE
    "Pattern: NR vs BASELINE" = c(-1, 0, 1, 0),

    # Test 3: R→N Pattern Effect (Capaldi control)
    # CAPALDI predicts: BASELINE > RN (weak persistence)
    "Pattern: RN vs BASELINE" = c(1, 0, 0, -1),

    # Test 4: CRITICAL - Effort vs Pattern
    # FESTINGER predicts: HIGH_EFFORT >= NR
    # CAPALDI predicts: NR > HIGH_EFFORT
    "CRITICAL: HIGH_EFFORT vs NR" = c(0, 1, -1, 0),

    # Test 5: N→R vs R→N (Capaldi's sequence specificity)
    # CAPALDI predicts: NR > RN (large effect)
    "Sequence: NR vs RN" = c(0, 0, 1, -1)
  )

  # Run contrasts
  contrasts_result <- contrast(emm, method = contrast_list, adjust = "none")

  cat("Planned Contrast Results:\n")
  print(summary(contrasts_result, infer = TRUE))
  cat("\n")

  # Calculate effect sizes for each contrast
  cat("Effect Sizes (Cohen's d):\n")
  contrast_df <- as.data.frame(summary(contrasts_result))

  for (i in 1:nrow(contrast_df)) {
    # Approximate Cohen's d from t-value
    # d = t * sqrt(2/n) for equal groups
    n_per_group <- nrow(df) / 4
    d_approx <- contrast_df$t.ratio[i] * sqrt(2 / n_per_group)
    cat(sprintf("  %s: d = %.3f\n", contrast_df$contrast[i], d_approx))
  }
  cat("\n")

  return(contrasts_result)
}

# =============================================================================
# EQUIVALENCE TESTING (FOR NULL HYPOTHESES)
# =============================================================================

#' Test equivalence for contrasts predicted to be null
#'
#' Uses TOSTER package for two one-sided tests (TOST)
#' Bounds set at d = ±0.3 (small effect)
#'
#' @param df Cleaned dataframe
run_equivalence_tests <- function(df) {

  cat("=== EQUIVALENCE TESTING ===\n\n")
  cat("Testing whether effects are smaller than d = 0.3 (small effect)\n\n")

  # Capaldi predicts HIGH_EFFORT = BASELINE
  high_effort <- df %>% filter(condition == "HIGH_EFFORT") %>% pull(extinction_chests)
  baseline <- df %>% filter(condition == "BASELINE") %>% pull(extinction_chests)

  cat("Test: HIGH_EFFORT vs BASELINE (Capaldi predicts equivalence)\n")

  tost_result <- TOSTtwo(
    m1 = mean(high_effort), m2 = mean(baseline),
    sd1 = sd(high_effort), sd2 = sd(baseline),
    n1 = length(high_effort), n2 = length(baseline),
    low_eqbound_d = -0.3, high_eqbound_d = 0.3,
    alpha = 0.05,
    plot = FALSE
  )

  cat(sprintf("  NHST p-value: %.4f\n", tost_result$NHST_p))
  cat(sprintf("  TOST p-value (lower bound): %.4f\n", tost_result$TOST_p1))
  cat(sprintf("  TOST p-value (upper bound): %.4f\n", tost_result$TOST_p2))
  cat(sprintf("  Observed d: %.3f\n", tost_result$dif / tost_result$se * sqrt(2/length(baseline))))

  if (tost_result$TOST_p1 < 0.05 & tost_result$TOST_p2 < 0.05) {
    cat("  Conclusion: Evidence FOR equivalence (supports Capaldi)\n\n")
  } else {
    cat("  Conclusion: Cannot conclude equivalence\n\n")
  }

  return(tost_result)
}

# =============================================================================
# BAYESIAN ANALYSIS (FOR NULL EFFECTS)
# =============================================================================

#' Bayesian analysis for testing null effects
#'
#' Computes Bayes Factors to quantify evidence for H0 vs H1
#'
#' @param df Cleaned dataframe
run_bayesian_analysis <- function(df) {

  cat("=== BAYESIAN ANALYSIS ===\n\n")

  # Test: HIGH_EFFORT vs BASELINE
  high_effort <- df %>% filter(condition == "HIGH_EFFORT") %>% pull(extinction_chests)
  baseline <- df %>% filter(condition == "BASELINE") %>% pull(extinction_chests)

  bf_effort <- ttestBF(high_effort, baseline, paired = FALSE)

  cat("HIGH_EFFORT vs BASELINE:\n")
  cat(sprintf("  BF10 (evidence for H1): %.3f\n", exp(bf_effort@bayesFactor$bf)))
  cat(sprintf("  BF01 (evidence for H0): %.3f\n", 1/exp(bf_effort@bayesFactor$bf)))

  bf01 <- 1/exp(bf_effort@bayesFactor$bf)
  cat("  Interpretation: ")
  if (bf01 > 10) {
    cat("Strong evidence for H0 (no effect)\n")
  } else if (bf01 > 3) {
    cat("Moderate evidence for H0 (no effect)\n")
  } else if (bf01 > 1) {
    cat("Weak evidence for H0\n")
  } else {
    cat("Evidence favors H1 (there IS an effect)\n")
  }
  cat("\n")

  return(bf_effort)
}

# =============================================================================
# MEDIATION ANALYSIS
# =============================================================================

#' Test Capaldi's mediation mechanism
#'
#' Condition → Pattern Detection → Expectation → Persistence
#' Requires survey data merged in
#'
#' @param df Dataframe with survey responses
run_mediation_capaldi <- function(df) {

  cat("=== MEDIATION ANALYSIS (CAPALDI) ===\n\n")

  # NOTE: This requires survey data with these variables:
  # - pattern_detected: Did they notice the pattern? (Q2)
  # - expectation_after_empty: "After empty, I expected coins" (Q8)

  # Check if variables exist
  if (!all(c("pattern_detected", "expectation_after_empty") %in% names(df))) {
    cat("Mediation variables not found in data.\n")
    cat("Required: pattern_detected, expectation_after_empty\n")
    cat("Skipping mediation analysis.\n\n")
    return(NULL)
  }

  # Filter to NR vs BASELINE comparison
  df_med <- df %>%
    filter(condition %in% c("NR_PATTERN", "BASELINE")) %>%
    mutate(condition_nr = ifelse(condition == "NR_PATTERN", 1, 0))

  # Define mediation model
  model <- '
    # a path: Condition → Pattern Detection
    pattern_detected ~ a * condition_nr

    # b path: Pattern Detection → Expectation
    expectation_after_empty ~ b * pattern_detected

    # c path: Direct effect on DV
    extinction_chests ~ cp * condition_nr + c2 * expectation_after_empty

    # Indirect effect
    indirect := a * b * c2
    total := indirect + cp
    proportion_mediated := indirect / total
  '

  # Fit model
  fit <- sem(model, data = df_med, se = "bootstrap", bootstrap = 1000)

  cat("Mediation Results:\n")
  print(summary(fit, standardized = TRUE))
  cat("\n")

  return(fit)
}

#' Test Festinger's mediation mechanism
#'
#' Condition → Perceived Effort → Coin Value → Persistence
#' Requires survey data merged in
#'
#' @param df Dataframe with survey responses
run_mediation_festinger <- function(df) {

  cat("=== MEDIATION ANALYSIS (FESTINGER) ===\n\n")

  # NOTE: This requires survey data with these variables:
  # - perceived_effort: "How much work did it take?" (Q4)
  # - coin_value: "How valuable were the coins?" (Q10)

  # Check if variables exist
  if (!all(c("perceived_effort", "coin_value") %in% names(df))) {
    cat("Mediation variables not found in data.\n")
    cat("Required: perceived_effort, coin_value\n")
    cat("Skipping mediation analysis.\n\n")
    return(NULL)
  }

  # Filter to HIGH_EFFORT vs BASELINE comparison
  df_med <- df %>%
    filter(condition %in% c("HIGH_EFFORT", "BASELINE")) %>%
    mutate(condition_high = ifelse(condition == "HIGH_EFFORT", 1, 0))

  # Define mediation model
  model <- '
    # a path: Condition → Perceived Effort
    perceived_effort ~ a * condition_high

    # b path: Perceived Effort → Value
    coin_value ~ b * perceived_effort

    # c path: Direct effect on DV
    extinction_chests ~ cp * condition_high + c2 * coin_value

    # Indirect effect
    indirect := a * b * c2
    total := indirect + cp
    proportion_mediated := indirect / total
  '

  # Fit model
  fit <- sem(model, data = df_med, se = "bootstrap", bootstrap = 1000)

  cat("Mediation Results:\n")
  print(summary(fit, standardized = TRUE))
  cat("\n")

  return(fit)
}

# =============================================================================
# VISUALIZATIONS
# =============================================================================

#' Create main results bar plot
#'
#' Shows mean extinction persistence by condition with error bars
#'
#' @param df Cleaned dataframe
#' @return ggplot object
plot_main_results <- function(df) {

  # Calculate summary stats
  summary_df <- df %>%
    group_by(condition) %>%
    summarise(
      mean = mean(extinction_chests),
      se = sd(extinction_chests) / sqrt(n()),
      .groups = "drop"
    )

  # Create nice labels
  condition_labels <- c(
    "BASELINE" = "Baseline\n(Random, 3 clicks)",
    "HIGH_EFFORT" = "High Effort\n(Random, 10 clicks)",
    "NR_PATTERN" = "N→R Pattern\n(Empty→Coin)",
    "RN_PATTERN" = "R→N Pattern\n(Coin→Empty)"
  )

  # Plot
  p <- ggplot(summary_df, aes(x = condition, y = mean, fill = condition)) +
    geom_col(width = 0.7, color = "black", size = 0.5) +
    geom_errorbar(aes(ymin = mean - se, ymax = mean + se),
                  width = 0.25, size = 0.8) +
    geom_jitter(data = df, aes(y = extinction_chests),
                width = 0.2, alpha = 0.3, size = 1.5, color = "black") +
    scale_x_discrete(labels = condition_labels) +
    scale_fill_manual(values = c(
      "BASELINE" = "#95a5a6",
      "HIGH_EFFORT" = "#e74c3c",
      "NR_PATTERN" = "#3498db",
      "RN_PATTERN" = "#9b59b6"
    )) +
    labs(
      title = "Experiment 1: How Long Did Students Keep Hunting After Coins Stopped?",
      subtitle = "Primary DV: Number of chests opened in extinction (all empty)",
      y = "Chests Opened (out of 30)",
      x = NULL,
      caption = "Error bars = ±1 SE; Points = individual participants"
    ) +
    theme_minimal(base_size = 14) +
    theme(
      legend.position = "none",
      plot.title = element_text(face = "bold", size = 16),
      plot.subtitle = element_text(color = "gray40"),
      axis.text.x = element_text(size = 11),
      panel.grid.major.x = element_blank()
    ) +
    coord_cartesian(ylim = c(0, 32))

  return(p)
}

#' Create survival curve plot
#'
#' Shows proportion of participants still hunting at each trial
#'
#' @param df Cleaned dataframe
#' @return ggplot object
plot_survival_curves <- function(df) {

  # Create survival data
  trials <- seq(1, 30, by = 1)

  survival_df <- expand.grid(
    condition = levels(df$condition),
    trial = trials
  ) %>%
    rowwise() %>%
    mutate(
      prop_still_hunting = mean(df$extinction_chests[df$condition == condition] >= trial)
    ) %>%
    ungroup()

  # Plot
  p <- ggplot(survival_df, aes(x = trial, y = prop_still_hunting,
                                color = condition, group = condition)) +
    geom_line(size = 1.5) +
    geom_point(size = 2) +
    scale_color_manual(
      values = c(
        "BASELINE" = "#95a5a6",
        "HIGH_EFFORT" = "#e74c3c",
        "NR_PATTERN" = "#3498db",
        "RN_PATTERN" = "#9b59b6"
      ),
      labels = c(
        "BASELINE" = "Baseline",
        "HIGH_EFFORT" = "High Effort",
        "NR_PATTERN" = "N→R Pattern",
        "RN_PATTERN" = "R→N Pattern"
      )
    ) +
    scale_y_continuous(labels = scales::percent) +
    labs(
      title = "When Did Students Give Up?",
      subtitle = "Survival curves showing proportion still hunting at each trial",
      y = "% Still Hunting",
      x = "Extinction Trial",
      color = "Condition"
    ) +
    theme_minimal(base_size = 14) +
    theme(
      plot.title = element_text(face = "bold"),
      legend.position = "bottom"
    )

  return(p)
}

#' Create violin plot with individual points
#'
#' @param df Cleaned dataframe
#' @return ggplot object
plot_violin <- function(df) {

  condition_labels <- c(
    "BASELINE" = "Baseline",
    "HIGH_EFFORT" = "High Effort",
    "NR_PATTERN" = "N→R Pattern",
    "RN_PATTERN" = "R→N Pattern"
  )

  p <- ggplot(df, aes(x = condition, y = extinction_chests, fill = condition)) +
    geom_violin(alpha = 0.4, draw_quantiles = c(0.5)) +
    geom_jitter(width = 0.15, alpha = 0.5, size = 2) +
    stat_summary(fun = mean, geom = "point", size = 4, shape = 18, color = "black") +
    scale_x_discrete(labels = condition_labels) +
    scale_fill_manual(values = c(
      "BASELINE" = "#95a5a6",
      "HIGH_EFFORT" = "#e74c3c",
      "NR_PATTERN" = "#3498db",
      "RN_PATTERN" = "#9b59b6"
    )) +
    labs(
      title = "Distribution of Persistence by Condition",
      y = "Chests Opened in Extinction",
      x = NULL
    ) +
    theme_minimal(base_size = 14) +
    theme(legend.position = "none")

  return(p)
}

# =============================================================================
# COMPLETE ANALYSIS PIPELINE
# =============================================================================

#' Run complete analysis pipeline
#'
#' @param data_dir Directory containing data files
#' @param output_dir Directory for saving outputs
run_full_analysis <- function(data_dir = "data/", output_dir = "output/") {

  cat("====================================================================\n")
  cat("EXPERIMENT 1: DIGITAL TREASURE HUNT - FULL ANALYSIS\n")
  cat("====================================================================\n\n")

  # Create output directory
  if (!dir.exists(output_dir)) {
    dir.create(output_dir, recursive = TRUE)
  }

  # Load data
  cat("Loading data...\n")
  df <- load_treasure_hunt_data(data_dir)

  # Apply exclusions
  df_clean <- apply_exclusions(df)

  # Descriptive statistics
  desc_stats <- descriptive_stats(df_clean)

  # Primary ANOVA
  model <- run_primary_anova(df_clean)

  # Planned contrasts
  contrasts <- run_planned_contrasts(model, df_clean)

  # Equivalence testing
  tost <- run_equivalence_tests(df_clean)

  # Bayesian analysis
  bf <- run_bayesian_analysis(df_clean)

  # Mediation (if survey data available)
  # med_capaldi <- run_mediation_capaldi(df_clean)
  # med_festinger <- run_mediation_festinger(df_clean)

  # Create visualizations
  cat("Creating visualizations...\n")

  p1 <- plot_main_results(df_clean)
  p2 <- plot_survival_curves(df_clean)
  p3 <- plot_violin(df_clean)

  # Combine plots
  combined <- p1 / p2 / p3

  # Save plots
  ggsave(file.path(output_dir, "main_results.png"), p1,
         width = 10, height = 8, dpi = 300)
  ggsave(file.path(output_dir, "survival_curves.png"), p2,
         width = 10, height = 6, dpi = 300)
  ggsave(file.path(output_dir, "violin_plot.png"), p3,
         width = 10, height = 6, dpi = 300)
  ggsave(file.path(output_dir, "combined_results.png"), combined,
         width = 12, height = 18, dpi = 300)

  cat("\n")
  cat("====================================================================\n")
  cat("ANALYSIS COMPLETE\n")
  cat("====================================================================\n")
  cat(sprintf("Outputs saved to: %s\n", output_dir))

  # Return all results
  return(list(
    data = df_clean,
    descriptives = desc_stats,
    anova = model,
    contrasts = contrasts,
    equivalence = tost,
    bayes = bf,
    plots = list(main = p1, survival = p2, violin = p3)
  ))
}

# =============================================================================
# EXAMPLE USAGE WITH SIMULATED DATA
# =============================================================================

#' Generate simulated data for testing
#'
#' Creates fake data based on theoretical predictions
#'
#' @param n_per_condition Number of participants per condition
#' @return Simulated dataframe
generate_simulated_data <- function(n_per_condition = 80) {

  cat("Generating simulated data for testing...\n\n")

  # Based on theoretical predictions (Capaldi supported)
  # BASELINE: Mean = 10, SD = 8
  # HIGH_EFFORT: Mean = 10 (same as baseline, Festinger NOT supported)
  # NR_PATTERN: Mean = 18 (Capaldi supported)
  # RN_PATTERN: Mean = 6 (Capaldi supported)

  set.seed(42)

  df <- data.frame(
    participant_id = 1:(4 * n_per_condition),
    condition = factor(rep(c("BASELINE", "HIGH_EFFORT", "NR_PATTERN", "RN_PATTERN"),
                           each = n_per_condition),
                       levels = c("BASELINE", "HIGH_EFFORT", "NR_PATTERN", "RN_PATTERN")),
    stringsAsFactors = FALSE
  )

  # Generate DV based on condition
  df <- df %>%
    mutate(
      extinction_chests = case_when(
        condition == "BASELINE" ~ round(pmax(0, pmin(30, rnorm(n(), 10, 8)))),
        condition == "HIGH_EFFORT" ~ round(pmax(0, pmin(30, rnorm(n(), 10, 8)))),
        condition == "NR_PATTERN" ~ round(pmax(0, pmin(30, rnorm(n(), 18, 7)))),
        condition == "RN_PATTERN" ~ round(pmax(0, pmin(30, rnorm(n(), 6, 5))))
      )
    )

  return(df)
}

# Run with simulated data (uncomment to test)
# simulated_df <- generate_simulated_data()
# desc_stats <- descriptive_stats(simulated_df)
# model <- run_primary_anova(simulated_df)
# contrasts <- run_planned_contrasts(model, simulated_df)

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# When running the script directly:
if (interactive()) {
  cat("To run the full analysis, use:\n")
  cat("  results <- run_full_analysis('path/to/data/')\n\n")
  cat("To test with simulated data:\n")
  cat("  df <- generate_simulated_data()\n")
  cat("  model <- run_primary_anova(df)\n")
}
