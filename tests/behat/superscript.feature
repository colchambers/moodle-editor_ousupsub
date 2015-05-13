@editor @editor_ousupsub @_bug_phantomjs
Feature: ousupsub superscript button
  To format text in ousupsub, I need to use the superscript button.

  @javascript
  Scenario: Subscript some text
    Given I am on the integrated "sup" editor test page
    And I set the field "Input" to "Helicopter"
    And I select the text in the "Input" ousupsub editor
    When I click on "Superscript" "button"
    Then I should see "<sup>Helicopter</sup>" in the "Input" ousupsub editor

    # Apply superscript inside existing superscript 
    When I select the range "'sup',2,'sup',5" in the "Input" ousupsub editor
    And I click on "Superscript" "button"
    Then I should see "<sup>He</sup>lic<sup>opter</sup>" in the "Input" ousupsub editor
    
    # Revert superscript 
    And I click on "Superscript" "button"
    Then I should see "<sup>Helicopter</sup>" in the "Input" ousupsub editor
    
    # Select existing superscript block 
    When I select the range "'sup',0,'sup',10" in the "Input" ousupsub editor
    And I click on "Superscript" "button"
    Then I should see "Helicopter" in the "Input" ousupsub editor
    
    # Apply superscript again
    When I select the range "'',3,'',5" in the "Input" ousupsub editor
    And I click on "Superscript" "button"
    Then I should see "Hel<sup>ic</sup>opter" in the "Input" ousupsub editor
    
    # Select outside sup tags. Click button
    When I select the range "0,3,2,0" in the "Input" ousupsub editor
    And I click on "Superscript" "button"
    Then I should see "Helicopter" in the "Input" ousupsub editor