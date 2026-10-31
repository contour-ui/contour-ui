#pragma once

#include <soundor/soundor.h>

#include "PluginProcessor.h"

// Your plugin's editor. Inherits soundor::AudioProcessorEditor, the view the
// Soundor UI renders into.
class ContourSandboxEditor final : public soundor::AudioProcessorEditor
{
public:
    explicit ContourSandboxEditor(ContourSandboxProcessor&);
    ~ContourSandboxEditor() override = default;

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ContourSandboxEditor)
};
